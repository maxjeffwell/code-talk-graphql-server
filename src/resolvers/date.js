module.exports = {
    parseValue(value) {
        return new Date(value);
    },
    serialize(value) {
        return new Date(value);
    }
}
