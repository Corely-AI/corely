export interface IdGeneratorPort {
  next(): string;
}

export const ID_GENERATOR_TOKEN = Symbol("ID_GENERATOR_TOKEN");
