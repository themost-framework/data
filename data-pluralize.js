
const singularRules = [
    [
        /data$/,
        'data'
    ]
]

/**
 * @param {*} pluralize
 */
function setSingularRules(pluralize) {
    singularRules.forEach(rule => {
        pluralize.addSingularRule(rule[0], rule[1])
    });
}

export {
    setSingularRules
}