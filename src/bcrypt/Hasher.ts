export interface Hasher {
  generate(text: string): Promise<string>;
  compare(text: string, hashed: string): Promise<boolean>;
}
