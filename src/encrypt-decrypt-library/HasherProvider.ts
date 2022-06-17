export interface HasherProvider {
  encrypt(text: string): string;
  decrypt(text: string): string;
}
