const icons = {
    'AP': 'arrow-purple.png',
    'AG': 'arrow-green.png',
    'AR': 'arrow-red.png',
    'AY': 'arrow-yellow.png',
    'AB': 'arrow-blue.png',
    'Shin': 'pure-white.png',
    '[t]': 'black-dot.png',
    'Ile': 'pink-diamond.png',
    'Leu': 'pink-circle.png',
    'Val': 'pink-hexa.png',
    'Arg': 'pink-penta.png',
    'Cys': 'pink-square.png',
    'Met': 'plain-triangle.png',
    'Glu': 'pink-star.png',
    'Gln': 'pink-hollow-square.png',
    'Ser': 'white-circle.png',
    'Thr': 'white-diamond.png',
    'Ala': 'white-hexa.png',
    'Gly': 'white-penta.png',
    'Pro': 'white-square.png',
    'His': 'white-triangle.png',
    'Asp': 'white-star.png',
    'Asn': 'white-hollow-square.png',
    'Lys': 'orange-circle.png',
    'Tyr': 'orange-diamond.png',
    'Trp': 'orange-penta.png',
    'Phe': 'orange-square.png',
    'Sec': 'green-hexa.png',
    '16S': 'green-penta.png',
    '5S' : 'green-square.png',
    '23S': 'green-triangle.png'
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { icons };
}

if (typeof globalThis !== 'undefined') {
    globalThis.GSP_ICONS = icons;
}
