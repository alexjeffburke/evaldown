var pathModule = require('path');
var fs = require('fs')

module.exports = function locateBabelrc() {
    var dirFragments = pathModule.dirname(require.main.filename).split(pathModule.sep).slice(1);
    for (var i = dirFragments.length ; i >= 0 ; i -= 1) {
        try {
            var tryBabelRcPath = pathModule.resolve('/' + dirFragments.slice(0, i).join(pathModule.sep), '.babelrc');
            var stats = fs.statSync(tryBabelRcPath);
            if (stats.isFile()) {
              return tryBabelRcPath;
            }
        } catch (e) {}
    }
};
