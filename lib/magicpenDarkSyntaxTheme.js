module.exports = {
    name: 'dark-syntax-theme',
    installInto: function (pen) {
        pen.installTheme('html', {
            jsComment: 'gray',
            jsFunctionName: 'jsKeyword',
            jsKeyword: '#F92672', // red
            jsNumber: [],
            jsPrimitive: 'white',
            jsRegexp: '#E6DB74', // yellow
            jsString: '#E6DB74', // yellow
            jsKey: '#A6E22E', // green
            diffAddedHighlight: ['bgGreen', 'black'],
            diffRemovedHighlight: ['bgRed', 'black'],

            prismComment: 'jsComment',
            prismSymbol: [ '#800080', 'bold' ], // purple
            prismString: 'jsString',
            prismOperator: '#F92672',
            prismKeyword: 'jsKeyword',
            prismRegex: 'jsRegexp',

            prismFunction: []
        });
    }
};
