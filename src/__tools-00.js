tools = {
	// often used Java types
	Byte:     Java.type('java.lang.Byte'),
	Bytes:    Java.type('byte[]'),
	Integer:  Java.type('java.lang.Integer'),
	Integers: Java.type('int[]'),
	Double:   Java.type('java.lang.Double'),
	Doubles:  Java.type('double[]'),

	// convert 4-bit code to Hex
	numToHex4 : function(b){
		b = b & 0xF;
		return String.fromCharCode( (b <= 9) ? (b + 48) : (b + 87) );
	},
	// convert byte to Hex
	numToHex8 : function(b){ return ( tools.numToHex4(b >> 4) + tools.numToHex4(b) ); },
	// convert number to Hex
	numToHex: function(n, w){
		var h = [];
		w = (w === undefined) ? 0 : w;
		while (n > 0){ h.unshift( tools.numToHex4(n & 0xF) ); n >>>= 4; }
		if (h.length == 0) h.unshift('0');
		while (h.length < w){ h.unshift('0'); }
		return h.join('');
	},
	// convert array of bytes to Hex string
	bytesToHex: function(a, sep, prefix){
		sep = (sep === undefined) ? ',' : sep;
		prefix = (prefix === undefined) ? '' : prefix;
		var buf = [];
		for (var i=0; i<a.length; i++) buf.push( prefix + tools.numToHex8( a[i] ));
		return buf.join(sep);
	},
	// convert string to bytes and to Hex
	stringToHex: function(s, sep, prefix){
		return tools.bytesToHex( tools.stringToBytes(s), sep, prefix );
	},
	
	// convert 3-bit code to Oct
	numToOct3 : function(b){ return String.fromCharCode( (b & 7) + 48 ); },
	// convert 6-bit code to Oct
	numToOct6 : function(b){ return tools.numToOct3(b >> 3) + tools.numToOct3(b); },
	// convert 9-bit code to Oct
	numToOct9 : function(b){ return tools.numToOct3(b >> 6) + tools.numToOct6(b); },

	// convert byte to char, using Hex escape if necessary
	byteToCharEsc : function(b, oct, crLfTab, showCrLf){
		b &= 0xFF;
		return	(b == 0x22) ? '"' :
				(b == 0x27) ? "'" :
				(b == 0x5C) ? "\\"  :
				(b == 0x07) ? "\\a" :
				(b == 0x08) ? "\\b" :
				(b == 0x0C) ? "\\f" :
				(b == 0x0A) ? ((crLfTab) ? "\\n" : ( showCrLf ? '↩' : '' ) + String.fromCharCode(b)) :
				(b == 0x0D) ? ((crLfTab) ? "\\r" : ( showCrLf ? '␍' : '' ) + String.fromCharCode(b)) :
				(b == 0x09) ? ((crLfTab) ? "\\t" : String.fromCharCode(b)) :
				(b == 0x0B) ? "\\v" :
				((b >= 32)&&(b < 127)) ? String.fromCharCode(b) :
				(oct) ? ('\\' + tools.numToOct9(b)) :
				('\\x' + tools.numToHex8(b).toUpperCase());
	},
	// convert array of bytes to string, escaping non-printable chars
	bytesToStringEsc : function(ba, oct, crLfTab, showCrLf){
		var buf = [];
		for (var i=0; i<ba.length; i++) buf.push( tools.byteToCharEsc(ba[i], oct, crLfTab, showCrLf));
		return buf.join('');
	},
	// escape string
	stringEsc : function(s, oct, crLfTab, showCrLf){ return tools.bytesToStringEsc( tools.stringToBytes(s), oct, crLfTab, showCrLf ); },
	// convert array of bytes to string
	bytesToString : function(a){
		var buf = [];
		for (var i=0; i<a.length; i++) buf.push( String.fromCharCode(a[i] & 0xFF ));
		return buf.join('');
	},
	// convert string to array of bytes
	stringToBytes : function(s){
		var a = [];
		for (var i=0; i<s.length; i++) a.push( s.charCodeAt(i) & 0xFF );
		return a;
	},
	
	stringToUtf8: function(s){ return unescape( encodeURIComponent( s ) ); },
	utf8ToString: function(s){ decodeURIComponent( escape( s ) ); },
	
	// split string to lines
	stringLines: function(s){ return s.split('\n'); },

	// convert Hex string to number
	hexToNum : function(h){
		var n = 0;
		for (var i=0; i<h.length; i++){
			var c = h.charCodeAt(i), m=0;
			if ((c >= 48)&&(c <= 57))       m = 48;
			else if ((c >= 65)&&(c <= 70))  m = 55;
			else if ((c >= 97)&&(c <= 102)) m = 87;
            if (m>0) n = (n << 4) | (c - m);
		}
		return n;
	},
	// convert string of Hex bytes, separated by [,;] to byte array
	hexToBytes : function(s){
		var a = [];
		var sb = s.toLowerCase().replace(/\r/g, '').replace(/\n/g, ',').replace(/0x/g, '').replace(/;/g, ',').split(',');
		for (var i=0; i<sb.length; i++) a.push(tools.hexToNum( sb[i] ) & 0xFF);
		return a;
	},
	// convert string of non-separated Hex bytes to byte array
	hexLineToBytes: function(hex){
		var b = [];
		if (hex.length > 0){
			if ((hex.length % 2) == 1) hex = '0' + hex;
			for (var i=0; i<hex.length; i+=2)
				b.push( tools.hexToNum( hex.slice(i,i+2) ));
		}
		return b;
	},
	
	// trim c from right end
	trimRight: function(s, c){ while ((s.length > 0)&&(s[s.length-1] == c)) s = s.slice(0,-1); return s; },
	// trim c from left end
	trimLeft:  function(s, c){ while ((s.length > 0)&&(s[0] == c)) s = s.slice(1); return s; },
	// trim c from both ends
	trim:      function(s,c){ return tools.trimLeft(tools.trimRight(s,c), c); },

	// trim terminating LF
	trimLf:    function(s){ return ((s.length > 0)&&(s.charCodeAt(s.length-1) == 10)) ? s.slice(0,-1) : s; },
	// trim terminating CR
	trimCr:    function(s){ return ((s.length > 0)&&(s.charCodeAt(s.length-1) == 13)) ? s.slice(0,-1) : s; },
	// trim terminating CR/LF
	trimCrLf:  function(s){ return tools.trimCr(tools.trimLf(s)); },

	// trim CRLF in all strings of array
	trimCrLfs: function(a1){
		var a = a1.slice();
		for (var i=0; i<a.length; i++) a[i] = tools.trimCrLf(a[i]);
		return a;
	},

	// delete n empty strings
	delEmptyStrings: function(a1, n, fromBegin, fromEnd){
		var a = a1.slice();
		if (n === undefined) n = a.length;
		if (fromBegin) while ((a.length > 0)&&(n-- > 0)&&(a[0].length == 0)) a.shift();
		if (fromEnd)   while ((a.length > 0)&&(n-- > 0)&&(a[a.length-1].length == 0)) a.pop();
		return a;
	},
	
	// pad lines in array with prefix/suffix, starting at minNum index, ignoring empty lines if ignoreEmpty==true
	padLines: function(aIn, prefix, suffix, minNum, ignoreEmpty){
		minNum = (minNum === undefined) ? 0 : minNum;
		var a = aIn.slice();
		for (var i=0; i<a.length; i++){
			if ((i >= minNum)&&(!((ignoreEmpty && (a[i].length == 0)))))
				a[i] = prefix + a[i] + suffix;
		}
		return a;
	},
	
	// convert numeric array to native Double array
	doublesToNative: function(a){
		var ar = new tools.Doubles(a.length);
		for (var i=0; i<a.length; i++) ar[i] = a[i];
		return ar;
	},
	
	// parse 'key = value' string to object
	parseKV: function(s,kvSep,kSep){
		var kv = { kvNum:0 };
		kvSep = (kvSep === undefined) ? ',' : kvSep;
		kSep  = (kSep === undefined) ? '=' : kSep;
		kvs = s.trim().split(kvSep);
		for (var i=0; i<kvs.length; i++){
		    var kvkv = kvs[i].split(kSep);
		    if (kvkv.length == 2){
		        kv.kvNum++;
		        kv[ kvkv[0].trim() ] = kvkv[1].trim();
		    }
		}
		return kv;
	},
	
	// join props from oNew to oBase
	objJoin: function( oNew, oBase ){
		for (var k in oNew) if (oBase.hasOwnProperty(k)) oBase[k] = oNew[k];
		return oBase;
	},
	
	// convert binary to BCD
	binToBcd: function(bin){
		var bcd=0, sh=0;
		while (bin > 0){
			bcd |= (bin % 10) << sh;
			bin = (bin / 10) | 0;
            sh += 4;
		}
		return bcd;
	},
	// convert BCD to binary
	bcdToBin: function(bcd){
		var bin=0, mul=1;
		while (bcd > 0){
			bin += (bcd & 0xF) * mul;
			bcd >>= 4;
            mul *= 10;
		}
		return bin;
	},

	// swap nibbles of byte
	byteSwap: function(b){ return ((b & 0xF) << 4) | ((b >> 4) & 0xF); },
	
	// swap nibbles of bytes
	bytesSwap: function(bytesIn){
		var bytes = bytesIn.slice();
		for (var i=0; i<bytes.length; i++) bytes[i] = tools.gsm.pdu.byteSwap(bytes[i]);
		return bytes;
	},
	
	// convert byte to BCD
	byteToBcd: function(b){ return ((b >> 4) & 0xF) * 10 + (b & 0xF); },
}

