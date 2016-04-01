module.exports = {
    name: 'dark-syntax-theme',
    installInto: function (pen) {
        pen.installTheme('html', {
            jsComment: '#888',
            jsFunctionName: 'jsKeyword',
            jsKeyword: '#AE81FF',
            jsNumber: '#66D9EF',
            jsPrimitive: 'white',
            jsRegexp: '#AE81FF',
            jsString: '#E6DB74',
            jsKey: '#CCC',

            error: ['#F92672', 'bold'],
            success: ['#A6E22E', 'bold'],
            diffAddedLine: '#A6E22E',
            diffAddedHighlight: ['bg#A6E22E', 'black'],
            diffAddedSpecialChar: ['bg#A6E22E', 'cyan', 'bold'],
            diffRemovedLine: '#F92672',
            diffRemovedHighlight: ['bg#F92672', 'black'],
            diffRemovedSpecialChar: ['bg#F92672', 'cyan', 'bold'],
            partialMatchHighlight: 'bg#E6DB74',

            prismComment: 'jsComment',
            prismSymbol: [ '#66D9EF', 'bold' ],
            prismString: 'jsString',
            prismOperator: '#F92672',
            prismKeyword: '#F92672',
            prismRegex: '#AE81FF',

            prismFunction: []
        });
    }
};
