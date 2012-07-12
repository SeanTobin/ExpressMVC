var helpers	= require('swig/lib/helpers');

exports.trans	= function (indent, parentBlock, parser) {
	var key		= parser.parseVariable(this.args[0]),
		opts	= this.args[1] ? parser.parseVariable(this.args[1]) : false,
		output	= [];
		
	output.push(helpers.setVar('__key', key));
	output.push('var __opts = ' + (opts.name || 'undefined') + ' || {}; ');
	output.push('_output += _ext.i18next.t(__key, __opts);');
	
	return output.join('');
};