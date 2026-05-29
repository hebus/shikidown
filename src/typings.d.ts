// Déclare que tout import se terminant par .css?inline est une chaîne de caractères
declare module '*.css?inline' {
  const content: string;
  export default content;
}

// Optionnel : si vous utilisez d'autres formats
declare module '*.scss?inline' {
  const content: string;
  export default content;
}
