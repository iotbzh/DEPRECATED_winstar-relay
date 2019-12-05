/**
 * @license
 * Copyright (C) 2019 IoT.bzh Company
 * Contact: https://www.iot.bzh/licensing
 *
 * This file is part of the winstar-relay module of the IoT.bzh project.
 *
 * $WR_BEGIN_LICENSE$
 * Commercial License Usage
 *  Licensees holding valid commercial IoT.bzh licenses may use this file in
 *  accordance with the commercial license agreement provided with the
 *  Software or, alternatively, in accordance with the terms contained in
 *  a written agreement between you and The IoT.bzh Company. For licensing terms
 *  and conditions see https://www.iot.bzh/terms-conditions. For further
 *  information use the contact form at https://www.iot.bzh/contact.
 *
 * GNU General Public License Usage
 *  Alternatively, this file may be used under the terms of the GNU General
 *  Public license version 3. This license is as published by the Free Software
 *  Foundation and appearing in the file LICENSE.GPLv3 included in the packaging
 *  of this file. Please review the following information to ensure the GNU
 *  General Public License requirements will be met
 *  https://www.gnu.org/licenses/gpl-3.0.html.
 * $WR_END_LICENSE$
 */

import { WR_Core } from "./wr_core";
import { Observable, Subject } from 'rxjs';
import * as net from 'net';

/**
 *
 * @export
 * @class WR_Instance
 */
export class WR_Instance extends WR_Core {

    private socket: net.Socket;
    private deviceIp: string;
    private devicePort: number;
    private serverIp: string;
    private serverPort: number;

    /**
     * Both relays will set its state (on/off) as an observable.
     */
    out1$: Observable<string>;
    private _out1 = new Subject<string>();
    out2$: Observable<string>;
    private _out2 = new Subject<string>();

    /**
     * All data coming from the device will be set as an observable.
     */
    private _deviceEvent = new Subject<Buffer>();
    deviceEvent$: Observable<Buffer>;

    /**
     *Creates an instance of WR_Instance.
     * @param {string} serverIp
     * @param {number} serverPort
     * @param {string} deviceIp
     * @param {number} devicePort
     * @memberof WR_Instance
     */
    constructor(
        serverIp: string,
        serverPort: number,
        deviceIp: string,
        devicePort: number
    ) {
        super();
        this.serverIp = serverIp;
        this.serverPort = serverPort;
        this.deviceIp = deviceIp;
        this.devicePort = devicePort;

        this.deviceEvent$ = this._deviceEvent.asObservable();
        this.out1$ = this._out1.asObservable();
        this.out2$ = this._out2.asObservable();
    }

    /**
     * Create a connection to the device.
     *
     * @memberof WR_Instance
     */
    connect() {

        /**
         * net.createConnection()
         * Sets the initial connection.
         */
        this.socket = net.createConnection({ port: this.devicePort, host: this.deviceIp, localPort: this.serverPort, localAddress: this.serverIp }, () => {
            console.log('Winstar-relay socket created.');
        });

        this.socket.on('connect', () => {
            console.log('New Winstar-relay connection:' + this.deviceIp + ':' + this.devicePort);
        });

        /**
         * socket.on('data')
         * Tracks all responses from the device to the server.
         */
        this.socket.on('data', (data: Buffer) => {
            this._deviceEvent.next(data);
        });

        /**
         * socket.on('error')
         * Tracks errors connections between server and device.
         */
        this.socket.on('error', (err: any) => {
            console.log(err);
        });
    }

    /**
     * relayOff()
     * Creates and sends the frame to put the relay in 'off' mode.
     *
     * The parameter is the number of relay to manage.
     * Possible parameters values: 01, 02.
     *
     * @param {string} [numOut='01']
     * @memberof WR_Instance
     */
    relayOff(numOut: string = '01'): void {
        /**
         * 'const open' is the buffer frame to be sent to the device.
         */
        const open = this._openRelay(numOut);
        /**
         *  sendFrame() sends the buffer to the device.
         */
        this.sendFrame(open);

        /**
         * Set the state (on/off) for each relay.
         */
        if (numOut == '01') {
            this._out1.next('off');
        }
        else if (numOut == '02') {
            this._out2.next('off');
        }
    }

    /**
     * relayOn()
     * Creates and sends the frame to put the relay in 'on' mode.
     *
     * The parameter is the number of relay to manage.
     * Possible parameters values: 01, 02.
     *
     * @param {string} [numOut='01']
     * @memberof WR_Instance
     */
    relayOn(numOut: string = '01'): void {
        /**
         * 'const close' is the buffer frame to be sent to the device.
         */
        const close = this._closeRelay(numOut);
        /**
         *  sendFrame() sends the buffer to the device.
         */
        this.sendFrame(close);

        /**
         * Set the state (on/off) for each relay.
         */
        if (numOut == '01') {
            this._out1.next('on');
        }
        else if (numOut == '02') {
            this._out2.next('on');
        }
    }

    /**
     * readState()
     * Creates and sends the frame to read the 2 relays state.
     *
     * @memberof WR_Instance
     */
    readState(): void {
        /**
         * 'const state' is the buffer frame to be sent to the device.
         */
        const state = this._readState();
        /**
         *  sendFrame() sends the buffer to the device.
         */
        this.sendFrame(state);

        /**
         * Subscription to the device responses.
         */
        this.deviceEvent$.subscribe((data: Buffer) => {
            /**
             * The response with the state has 8 bytes length.
             */
            if (data.length == 8) {
                /**
                 * Split the response from device into its parts.
                 */
                let res = this.getResponseFrameDetail(data.toString('hex'));
                /**
                 * if the response (ACK part) is correct (in this case, '00')
                 */
                if (res.ACK == '00') {
                    this.setState(res.DATA);
                }
            }
        });
    }

    /**
     * setState()
     * Sets the response as observable
     *
     * @param {string} status
     * @returns {Error}
     * @memberof WR_Instance
     */
    private setState(status: string): Error {

        switch (status) {
            case 'f30f':
                this._out1.next('off');
                this._out2.next('off');
                break;
            case 'f30e':
                this._out1.next('on');
                this._out2.next('off');
                break;
            case 'f30d':
                this._out1.next('off');
                this._out2.next('on');
                break
            case 'f30c':
                this._out1.next('on');
                this._out2.next('on');
                break
            default:
                return new Error("unknown status");
        }

        return null;
    }

    /**
     * Sends the buffer frame to the device.
     *
     * @param {Buffer} frame
     * @returns {Error}
     * @memberof WR_Instance
     */
    sendFrame(frame: Buffer): Error {
        try {
            this.socket.write(frame);
        } catch (err) {
            console.error('Problem sending frame to Winstar device.');
            return err;
        }
        return null;
    }

}
