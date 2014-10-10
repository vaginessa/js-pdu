tools.gsm = {
		
	// generate empty SMS object
	emptySms: function(smsIn){
		var d = new Date();
		var sms = {
			error:true, sender:'', text:'', dateText:'', timeText:'',
			smscLen:0, smscType:0, smsc:'',
			senderLen:0, senderType:0,
			smsSubmit:0, firstOctet:0, tpMsgRef:0, tpPID:0, tpDCS:0xFF, tpVP:0,
			protocol:0, encoding:0,
			year:d.getFullYear(), month:d.getMonth()+1, date:d.getDate(), hour:d.getHours(), minute:d.getMinutes(), second:d.getSeconds(), tz:0,
			textLen:0, textRaw:[],
			bytes:[], pdu:'', pduLen:0,
		};
		if (smsIn !== undefined) sms = tools.objJoin( smsIn, sms );
		return sms;
	},

	pdu: {
	
		// PDU phone operations
		phone: {
			// phone types
			type: {NATIONAL:161, INTERNATIONAL:145, NETWORK:177},
			
			// check if phone number is packed
			isPacked: function(s){ return (s instanceof Array);},
			
			// return number of phone digits
			digits: function(s){
				if (!tools.gsm.pdu.phone.isPacked(s)) s = tools.gsm.pdu.phone.pack(s);
				return (s.length * 2) - ((((s[s.length-1]) & 0xF0) == 0xF0) ? 1 : 0);
			},
			
			// pack phone number to byte array
			pack: function(s){
				var h2b4 = function(hex){ var h = hex.charCodeAt(0); return ((h>47)&&(h<58)) ? (h-48) : ((h>96)&&(h<103)) ? (h-87) : ((h>64)&&(h<71)) ? (h-55) : 0; };
				var a = [];
				if (s.indexOf('+') == 0) s = s.slice(1);
				if ((s.length & 1) == 1) s += 'f';
				for (var i=0; i<s.length; i+=2) a.push( h2b4(s.charAt(i)) | (h2b4(s.charAt(i+1)) << 4) );
				return a;
			},

			// unpack phone number from byte array
			unpack: function(a){
				var b2h4 = function(b){ return String.fromCharCode( (b < 10) ? (b + 48) : (b < 16) ? (b + 55) : 48 ); };
				var s = ['+'];
				for (var i=0; i<a.length; i++) s.push(b2h4(a[i] & 0xF), ((a[i] & 0xF0) == 0xF0) ? '' : b2h4(a[i] >> 4));
				return s.join('');
			},
		},
		
		// PDU text operations
		text: {
		    // DCS codes
			dcs: {
				B7:0, B8:0x4, UCS2:0x08, AUTO:0xFF,
				auto: function(s, dcs){
					return ((dcs === undefined)||(dcs == tools.gsm.pdu.text.dcs.AUTO)) ?
						(tools.gsm.pdu.text.is7bit(s) ? tools.gsm.pdu.text.dcs.B7 : tools.gsm.pdu.text.dcs.UCS2) : dcs;
				},
			},
			
			// check if string is 7-bit
			is7bit: function(s){ for (var i=0; i<s.length; i++) if (s.charCodeAt(i) > 127) return false; return true; },

			// pack 7-bit array to 8-bit
			to8bit: function(a1){
				//'123456789abc' -> 31 D9 8C 56 B3 DD 70 B9 B0 78 OC
				//'hellohello'   -> E8 32 9B FD 46 97 D9 EC 37
				//'Hello!'       -> C8 32 9B FD 0E 01
				var a = a1.slice(0);
				var lenOut = (a.length - Math.floor(a.length >>> 3));
				if (a.length > 0){
					a.push(0);
					for (var i1=0; i1<(a.length-2); i1++){
						for (var i2=(a.length-2); i2>=i1; i2--){
						    a[i2] = a[i2] | (((a[i2+1] & 1) != 0) ? 0x80 : 0);
						    a[i2+1] >>= 1;
						}
					}
					a = a.slice(0, lenOut);
				}
				return a;
			},
			//unpack 8-bit array to 7-bit
			to7bit: function(a1){
				var a = a1.slice(0);
				var lenOut = a.length + (a.length >>> 3) + ((a.length & 7) ? 1 : 0);
				while (a.length < lenOut) a.push(0);
				if (a.length > 0){
					for (var i1=0; i1<(lenOut-1); i1++){
						for (var i2=(lenOut-2); i2>=i1; i2--){
							a[i2+1] = (a[i2+1] << 1) | (((a[i2] & 0x80) != 0) ? 1 : 0);
						}
					}
				}
				for (var i=0; i<a.length; i++) a[i] &= 0x7F;
				return a;
			},
			
			utf8ToUcs2: function(s){
				if (s instanceof Array) s = tools.bytesToString(s);
				return decodeURIComponent( escape( s ) );
			},
			ucs2ToUtf8: function(s, toWords){
				if (s instanceof Array){
					if (toWords) s = tools.gsm.pdu.text.bytesToWords(s);
					s = tools.bytesToString(s);
				}
				return unescape( encodeURIComponent( s ) );
			},
			
			bytesToWords: function(b){
				var w = [];
				for (var i=0; i<b.length; i+=2) w.push( (b[i] << 8) + b[i+1] );
				return w;
			},
			wordsToUcs2: function(w){
				for (var i=0; i<w.length; i++) w[i] = String.fromCharCode(w[i]);
				return w.join('');
			},
			bytesToUcs2: function(b){
				if (typeof(b) == 'string') b = tools.stringToBytes(b);
				return tools.gsm.pdu.text.wordsToUcs2( tools.gsm.pdu.text.bytesToWords(b) );
			},
			
			// pack string s to byte array
			pack: function(s, dcs){
				if ((dcs === undefined)||(dcs == tools.gsm.pdu.text.dcs.AUTO)) dcs = tools.gsm.pdu.text.dcs.auto(s);
				var b = [];
				for (var i=0; i<s.length; i++){
					var c = s.charCodeAt(i);
					if (dcs == tools.gsm.pdu.text.dcs.UCS2) b.push( (c >> 8) & 0xFF, c & 0xFF );
					else b.push( c & 0xFF );
				}
				if (dcs == tools.gsm.pdu.text.dcs.B7) b = tools.gsm.pdu.text.to8bit(b);
				return b;
			},
			// unpack byte array to string
			unpack: function(b, dcs){
				var s = [];
				return s.join('');
			},
		},
		
		// PDU date/time operations
		date: {
			// get current date/time in packed/unpacked format
			current: function(packed){
			},
			
			// pack date/time to bytes
			pack: function(dt){
				var d = [
					tools.byteSwap( tools.binToBcd((dt.year   || 0) % 100) ),
					tools.byteSwap( tools.binToBcd((dt.month  || 1) % 13)  ),
					tools.byteSwap( tools.binToBcd((dt.date   || 1) % 32)  ),
					tools.byteSwap( tools.binToBcd((dt.hour   || 0) % 25)  ),
					tools.byteSwap( tools.binToBcd((dt.minute || 0) % 60)  ),
					tools.byteSwap( tools.binToBcd((dt.second || 0) % 60)  ),
					tools.byteSwap( tools.binToBcd(dt.tz) )
				];
				return d;
			},
			// unpack date/time from bytes
			unpack: function(b, dt){
				dt = dt || {};
				dt.year   = tools.bcdToBin( tools.byteSwap(tools.b[0] || 0) ) + 2000; // year
				dt.month  = tools.bcdToBin( tools.byteSwap(tools.b[1] || 1) );        // month
				dt.date   = tools.bcdToBin( tools.byteSwap(tools.b[2] || 1) );        // date
				dt.hour   = tools.bcdToBin( tools.byteSwap(tools.b[3] || 0) );        // hour
				dt.minute = tools.bcdToBin( tools.byteSwap(tools.b[4] || 0) );        // minute
				dt.second = tools.bcdToBin( tools.byteSwap(tools.b[5] || 0) );        // second
				dt.tz     = tools.bcdToBin( tools.byteSwap(tools.b[6] || 0) );        // timezone
				return dt;
			},
		},
		
		//convert number from bytes to string
		bytesToTelNum: function(bytes){
			var s = [];
			for (var i=0; i<bytes.length; i++){
				s.push( String.fromCharCode( (bytes[i] & 0xF) + 48 ) );
				if ((bytes[i] & 0xF0) != 0xF0) s.push( String.fromCharCode( ((bytes[i] >> 4) & 0xF) + 48 ) );
			}
			return s.join('');
		},

		// encode incoming SMS to PDU packet
		encodeIn: function(sms){
			sms = tools.gsm.emptySms(sms);
			sms.bytes = [];
			
			// SMSC
			var smsc = tools.gsm.pdu.phone.pack(sms.smsc);
			sms.smscLen = smsc.length;
			sms.bytes.push(smsc.length+1, sms.smscType);
			sms.bytes = sms.bytes.concat(smsc);
			
			sms.bytes.push(sms.firstOctet);
			
			// sender
			var sender = tools.gsm.pdu.phone.pack(sms.sender);
			sms.bytes.push(tools.gsm.pdu.phone.digits(sender));
			sms.bytes.push(sms.senderType);
			sms.bytes = sms.bytes.concat(sender);
			
			var dcs = tools.gsm.pdu.text.dcs.auto(sms.text, sms.tpDCS);
			sms.bytes.push(sms.tpPID, dcs);
			
			// add date/time stamp
			sms.bytes = sms.bytes.concat( tools.gsm.pdu.date.pack( sms ) );
			
			// text
			var ud = tools.gsm.pdu.text.pack(sms.text, dcs);
			sms.bytes.push( (dcs == tools.gsm.pdu.text.dcs.B7) ? sms.text.length : ud.length );
			sms.bytes = sms.bytes.concat(ud);

			sms.pdu = tools.bytesToHex(sms.bytes,'','');
			sms.pduLen = sms.bytes.length - sms.smscLen - 2;
			
			return sms;
		},

		// decode incoming SMS PDU packet
		decodeIn: function(pdu){
			var sms   = tools.gsm.emptySms( {'pdu':pdu} );
			sms.bytes = tools.hexLineToBytes(sms.pdu);
			if (sms.bytes.length >= 25){
				sms.smscLen  = sms.bytes[0];
				if (sms.smscLen > 0){
					sms.smscType = sms.bytes[1];
					sms.smsc = ((sms.smscType == 145) ? '+' : '') + tools.gsm.pdu.bytesToTelNum( sms.bytes.slice(2, sms.smscLen + 1) );
				}
				sms.firstOctet = sms.bytes[sms.smscLen + 1];
				
				sms.senderLen  = (sms.bytes[sms.smscLen + 2] >> 1) + (sms.bytes[sms.smscLen + 2] & 1);
				sms.senderType = sms.bytes[sms.smscLen + 3];
				sms.sender     = ((sms.senderType == 145) ? '+' : '') + tools.gsm.pdu.bytesToTelNum( sms.bytes.slice(sms.smscLen + 4, sms.smscLen + sms.senderLen + 4) );
				
				sms.protocol = sms.bytes[sms.smscLen + sms.senderLen + 4];
				sms.encoding = sms.bytes[sms.smscLen + sms.senderLen + 5];
				
				sms.year     = tools.gsm.pdu.byteToBcd(tools.byteSwap(sms.bytes[sms.smscLen + sms.senderLen + 6])) + 2000;
				sms.month    = tools.gsm.pdu.byteToBcd(tools.byteSwap(sms.bytes[sms.smscLen + sms.senderLen + 7]));
				sms.date     = tools.gsm.pdu.byteToBcd(tools.byteSwap(sms.bytes[sms.smscLen + sms.senderLen + 8]));
				sms.dateText = sms.date + '/' + sms.month + '/' + sms.year;
				sms.hour     = tools.gsm.pdu.byteToBcd(tools.byteSwap(sms.bytes[sms.smscLen + sms.senderLen + 9]));
				sms.minute   = tools.gsm.pdu.byteToBcd(tools.byteSwap(sms.bytes[sms.smscLen + sms.senderLen + 10]));
				sms.second   = tools.gsm.pdu.byteToBcd(tools.byteSwap(sms.bytes[sms.smscLen + sms.senderLen + 11]));
				sms.timeText = sms.hour + ':' + sms.minute + ':' + sms.second;
				
				sms.textLen = sms.bytes[sms.smscLen + sms.senderLen + 13];
				sms.textRaw = sms.bytes.slice(sms.smscLen + sms.senderLen + 14, sms.smscLen + sms.senderLen + 14 + sms.textLen);
				sms.text    = tools.bytesToString(tools.gsm.pdu.to7bit(sms.textRaw));
			}
			return sms;
		},
		
		// decode outcoming SMS PDU packet
		decodeOut: function(pdu){
			var sms   = tools.gsm.emptySms( {'pdu':pdu} );
			sms.bytes = tools.hexLineToBytes(sms.pdu);
			var i = 0;

			sms.smscLen    = sms.bytes[i]; i++;
			if (sms.smscLen > 0) sms.smsc = tools.gsm.pdu.phone.unpack(sms.bytes.slice(i, i+sms.smscLen));
			i += sms.smscLen;
			
			sms.firstOctet = sms.bytes[i]; i++;
			sms.tpMsgRef   = sms.bytes[i]; i++;

			sms.senderLen  = (sms.bytes[i] + (sms.bytes[i] & 1)) >> 1; i++;
			sms.senderType = sms.bytes[i]; i++;
			sms.sender     = tools.gsm.pdu.phone.unpack(sms.bytes.slice(i, i + sms.senderLen));
			i += sms.senderLen;
			
			sms.tpPID      = sms.bytes[i]; i++;
			sms.tpDCS      = sms.bytes[i]; i++;
			sms.tpVP       = sms.bytes[i]; i++;

			sms.textLen    = sms.bytes[i]; i++;
			sms.textRaw    = sms.bytes.slice(i, i + sms.textLen);
			
			if (sms.tpDCS == tools.gsm.pdu.text.dcs.UCS2){
				sms.text = tools.gsm.pdu.text.bytesToUcs2( sms.textRaw );
			} else if (sms.tpDCS == tools.gsm.pdu.text.dcs.B7){
				sms.text = tools.bytesToString(tools.gsm.pdu.text.to7bit( sms.textRaw ));
			}

			sms.error      = false;
			
			return sms;
		},
	},
};
/*
var bin   = tools.stringToBytes('123456789abc');
var bout8 = tools.gsm.pdu.bytes7to8bit(bin);
var bout7 = tools.gsm.pdu.bytes8to7bit(bout8);
tools.log.msg('Test', (tools.bytesToHex(bin,'','') + '=' + tools.bytesToHex(bout8,'','') + '=' + tools.bytesToHex(bout7,'','')).toUpperCase());
*//*
var bin   = tools.stringToBytes('hellohello');
var bout8 = tools.gsm.pdu.bytes7to8bit(bin);
var bout7 = tools.gsm.pdu.bytes8to7bit(bout8);
tools.log.msg('Test', (tools.bytesToHex(bin,'','') + '=' + tools.bytesToHex(bout8,'','') + '=' + tools.bytesToHex(bout7,'','')).toUpperCase());
*/

/*
var sms = tools.gsm.pdu.decode('07911326040000F0040B911346610089F60000208062917314080CC8F71D14969741F977FD07');
print( sms.smscLen, sms.smscType, sms.smsc, sms.firstOctet, sms.senderLen, sms.senderType, sms.sender );
print( sms.protocol, sms.encoding, sms.dateText, sms.timeText, sms.textLen );
print( tools.bytesToHex(sms.textRaw), sms.text );
*/

