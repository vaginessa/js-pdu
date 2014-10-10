//Hayes AT commands tools
tools.at = {
	//generate/parse command
	cmd:{
		gen: function(cmd, params){
			cmd = cmd.toUpperCase();
			var b = [ (cmd.indexOf("AT") == 0) ? '' : 'AT', cmd ];
			if (params){
				if (params instanceof Array){
					for (var i=0; i<params.length; i++){
						if (i > 0) b.push(',');
						if (typeof(params[i]) == "string") b.push('"', params[i], '"');
						else b.push(params[i].toString());
					}
				} else b.push(params);
			}
			b.push('\r\n');
			return b.join('');
		},
		parse: function(cmd){
			cmd = tools.trimCrLf(cmd);
			var result = { cmd:'', cmdAt:'', raw:cmd, rebuild:'', params:[], nparams:0, error:true, };
			if ((cmd.indexOf('at') == 0) || (cmd.indexOf('AT') == 0)){
				cmd = cmd.slice(2);
				var eqIndex = cmd.indexOf('=');
				if ((eqIndex != -1) && (cmd.slice(-1) != '?')){
					result.cmd = cmd.slice(0, eqIndex);
					result.params = cmd.slice(eqIndex+1).split(',');
					for (var i=0; i<result.params.length; i++) result.params[i] = result.params[i].trim();
					result.nparams = result.params.length;
				} else {
					result.cmd = cmd;
				}
				result.cmd     = result.cmd.toUpperCase();
				result.cmdAt   = 'AT' + result.cmd.toUpperCase();
				result.rebuild = result.cmdAt + ((result.params.length > 0) ? ('=' + result.params.join(',')) : '');
				result.error   = false;
			}
			return result;
		},
	},
	
	//generate/parse reply
	reply: {
		gen: function(echo, text, status){
			var result = [tools.trimCrLf(echo)];
			if (text){
				if (text instanceof Array) result = result.concat(text);
				else result.push(tools.trimCrLf(text.toString()));
			}
			if (status) result.push(tools.trimCrLf(status).toUpperCase());
			return result.join('\r\n') + '\r\n';
		},
		parse: function(reply){
		    var lines  = tools.trimCrLfs(reply.split('\r'));
		    var result = { raw:reply, lines:lines.length, echo:'', text:'', status:'', error:true, };
		    if (lines.length >= 3){
		    	if (lines[lines.length-1].length == 0) lines.pop();
		        result.echo   = lines[0].trim().toUpperCase();
		        result.status = lines[lines.length-1].trim().toUpperCase();
		        result.text   = tools.delEmptyStrings(lines.slice(1,-2), 0, true, true).join('\r\n');
		        if (result.status == 'OK') result.error = false;
		    }
		    return result;
		},
	},
};

//var r = tools.at.cmd.parse('atz0= 1, 2, "123" ');
//print(r.error, r.cmd, r.cmdAt, r.params, r.rebuild);
//print(tools.bytesToStringEsc(tools.stringToBytes(tools.at.reply.gen('AT',['01020304',23,45],'error')), false, true));

