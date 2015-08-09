var extend = require('./extend');

module.exports = function (options) {
    options = extend({}, options || {});
    var unexpected = (options.unexpected || require('unexpected')).clone();
    unexpected.output.preferredWidth = options.preferredWidth || 80;
    if (typeof options.indentationWidth === 'number') {
        unexpected.output.indentationWidth = options.indentationWidth;
    }
    unexpected.installPlugin(require('magicpen-prism'));

    var themePlugin = options.theme === 'dark' ?
        require('./magicpenDarkSyntaxTheme') :
        require('./magicpenGithubSyntaxTheme');

    return unexpected.clone().installPlugin(themePlugin);
}
