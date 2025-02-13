import hoek from 'hoek'; // import Chance from 'chance';
// const chance = new Chance();

export default class ObjectParser {
  constructor(parser) {
    this.parser = parser;
  }

  canParse(node) {
    return !!node.properties;
  }

  parse(node) {
    return this.generateObject(node);
  }

  generateObject(node) {
    let ret = {};
    let schema = hoek.clone(node);
    schema = schema.properties || schema;

    for (let k in schema) {
      if (schema.hasOwnProperty(k)) {
        ret[k] = this.parser.parse(schema[k]);
      }
    }

    return ret;
  }

}