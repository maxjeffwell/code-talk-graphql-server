module.exports = {
  description: 'date scalar',
  parseValue(value) {
    return new Date(value); // transform value from the client
  },
  serialize(value) {
    return new Date(value); // value sent to the client
  }
}
