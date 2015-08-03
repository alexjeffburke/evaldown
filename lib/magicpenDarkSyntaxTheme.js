module.exports = {
    name: 'dark-syntax-theme',
    installInto: function (pen) {
        pen.installTheme('html', {
            jsComment: 'gray',
            jsFunctionName: 'jsKeyword',
            jsKeyword: '#FFAA27',
            jsNumber: [],
            jsPrimitive: 'white',
            jsRegexp: '#C6FF3C',
            jsString: '#3CDAFF',
            jsKey: '#939393',
            diffAddedHighlight: ['bgGreen', 'black'],
            diffRemovedHighlight: ['bgRed', 'black'],

            prismComment: 'jsComment',
            prismSymbol: 'jsPrimitive',
            prismString: 'jsString',
            prismOperator: 'jsString',
            prismKeyword: 'jsKeyword',
            prismRegex: 'jsRegexp',
            prismFunction: []
        });
    }
};
