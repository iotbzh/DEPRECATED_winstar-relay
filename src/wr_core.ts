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


/**
 *
 *
 * @export
 * @class WR_Core
 */
export class WR_Core {

    /**
     * Final frame to be sent to the device
     */
    private frame: string;
    /**
     * SOF: string
     * Fixed 0X68
     */
    private SOF: string = '68';
    /**
     * ADR: string
     * Address code; range is 1-254;
     */
    private ADR: string = '01';
    /**
     * CMD: string
     * Command of computer sends to device
     */
    private CMD: string = '';
    /**
     * LENGTH: string
     * not include itself, all bytes before XOR.
     * For example: DATA part have 3 byte AA, BB, CC, so LENGTH =0X3
     */
    private LENGTH: string = '';
    /**
     * DATA: string
     * Command parameter
     */
    private DATA: string = '';
    /**
     * XOR: string
     * Command parameter
     */
    private XOR: string = '';
    /**
     * EOF: string
     * Fixed 0X16
     */
    private EOF: string = '16';
    /**
     * ACK: string
     * Device response
     * =0:Correct execution computer command
     * =0X80 LENGTH error
     * =0X81 XOR validation error
     * =0X82 Invalid command
     * =0X83 parameter behind of LENGTH error
     */
    private ACK: string = '';

    constructor() {}

    /**
     * getXOR()
     * XOR validation error calculation
     *
     * @memberof WR_Core
     */
    getXOR(): void{
        const partial = this.CMD + this.DATA;
        let hexArray = Buffer.from(partial, 'hex');
        let bccLength = 0x00;
        hexArray.forEach(element => {
            bccLength = bccLength ^ element;
        });
        this.XOR = ('0'+bccLength.toString(16)).slice(-2);
    }

    /**
     * _openRelay()
     * Frame formation to put the relay in 'off' mode.
     *
     * @param {string} [numOut='01']
     * @returns {Buffer}
     * @memberof WR_Core
     */
    _openRelay(numOut: string = '01'): Buffer{
        this.CMD = 'a3';
        this.LENGTH = '01';
        this.DATA = numOut;

        this.getXOR();
        this.frame  = this.SOF + this.ADR + this.CMD + this.LENGTH + this.DATA + this.XOR + this.EOF;

        return Buffer.from(this.frame, 'hex');

    }

    /**
     *_closeRelay()
     * Frame formation to put the relay in 'on' mode.
     *
     * @param {string} [numOut='01']
     * @returns {Buffer}
     * @memberof WR_Core
     */
    _closeRelay(numOut: string = '01'): Buffer{
        this.CMD = 'a2';
        this.LENGTH = '01';
        this.DATA = numOut;

        this.getXOR();
        this.frame  = this.SOF + this.ADR + this.CMD + this.LENGTH + this.DATA + this.XOR + this.EOF;

        return Buffer.from(this.frame, 'hex');
    }

    /**
     * _readState()
     * Frame formation to read the actual relays mode (on/off).
     *
     * @returns {Buffer}
     * @memberof WR_Core
     */
    _readState(): Buffer{
        this.CMD = 'a7';
        this.LENGTH = '01';
        this.DATA = '00';

        this.getXOR();
        this.frame  = this.SOF + this.ADR + this.CMD + this.LENGTH + this.DATA + this.XOR + this.EOF;

        return Buffer.from(this.frame, 'hex');
    }

    /**
     * getCMDFrameDetail()
     * Split the command frame into its parts.
     *
     * @param {string} frameString
     * @returns
     * @memberof WR_Core
     */
    getCMDFrameDetail(frameString: string) {
        let split = frameString.split('');

        let splitFrame = {
            'SOF': split[0] + split[1],
            'ADR': split[2] + split[3],
            'CMD': split[4] + split[5],
            'LENGTH': split[6] + split[7],
            'DATA': split[8] + split[9],
            'XOR': split.map((val, ind, spl) => { return (ind > 9 && ind < spl.length - 2) ? val : ',' }).toString().replace(/,/gi, ''),
            'EOF': split[split.length - 2] + split[split.length - 1]
        };
        return splitFrame;
    }

    /**
     * getResponseFrameDetail()
     * Split the response from device into its parts.
     *
     * @param {string} frameString
     * @returns
     * @memberof WR_Core
     */
    getResponseFrameDetail(frameString: string) {
        let split = frameString.split('');

        let splitFrame = {
            'SOF': split[0] + split[1],
            'ADR': split[2] + split[3],
            'ACK': split[4] + split[5],
            'LENGTH': split[6] + split[7],
            'DATA': split.map((val, ind, spl) => { return (ind > 7 && ind < spl.length - 4) ? val : ',' }).toString().replace(/,/gi, ''),
            'XOR': split[split.length - 4] + split[split.length - 3],
            'EOF': split[split.length - 2] + split[split.length - 1]
        };
        return splitFrame;
    }

}
