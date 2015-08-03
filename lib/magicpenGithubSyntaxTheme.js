module.exports = {
    name: 'github-syntax-theme',
    installInto: function (pen) {
        pen.installTheme('html', {
            // Mimic github theme
            prismComment: 'jsComment',
            prismCdata: '#708090',

            prismPunctuation: '#000000',

            prismTag: '#63a35c',
            prismSymbol: '#0086b3',

            prismAttrname: '#795da3',

            prismOperator: 'jsKeyword',
            prismVariable: '#a67f59',

            prismString: 'jsString',
            prismUrl: 'prismString',
            cssString: 'prismString',
            prismEntity: 'prismString',
            prismAtrule: 'prismString',
            prismAttrValue: 'prismString',
            prismRegex: 'jsRegexp',

            prismKeyword: 'jsKeyword',

            prismFunction: '#000000',

            prismImportant: ['#0086b3', 'bold']
        });
    }
};
