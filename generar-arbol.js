// const fs = require("fs");
// const path = require("path");
import fs from 'fs';
import path from 'path';

const IGNORADAS = ["node_modules", ".git", "dist", ".vscode"];

function generarArbol(dir, prefix = "") {
  const items = fs.readdirSync(dir).filter((item) => !IGNORADAS.includes(item));
  items.sort();

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const fullPath = path.join(dir, item);
    const isLast = i === items.length - 1;
    const pointer = isLast ? "└── " : "├── ";
    output += prefix + pointer + item + "\n";

    if (fs.statSync(fullPath).isDirectory()) {
      generarArbol(fullPath, prefix + (isLast ? "    " : "│   "));
    }
  }
}

let output = "";
generarArbol(process.cwd());

fs.writeFileSync("estructura.txt", output, "utf8");
console.log("Archivo estructura.txt generado sin node_modules, .git, etc.");
