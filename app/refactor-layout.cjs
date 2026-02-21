const fs = require("node:fs");
const path = require("node:path");
const { execSync } = require("node:child_process");

const _srcDir = path.join(__dirname, "src");

// Find all tsx and ts files
const files = execSync('find src -type f -name "*.tsx" -o -name "*.ts"', {
    encoding: "utf-8",
})
    .split("\n")
    .filter(Boolean);

let updatedFilesCount = 0;

for (const file of files) {
    const filePath = path.join(__dirname, file);
    let content = fs.readFileSync(filePath, "utf-8");
    const originalContent = content;

    // Check if the file imports from @radix-ui/themes
    if (!content.includes("@radix-ui/themes")) {
        continue;
    }

    // Regex to find import { ... } from "@radix-ui/themes";
    const importRegex =
        /import\s+\{([^}]+)\}\s+from\s+['"]@radix-ui\/themes['"];?/g;

    content = content.replace(importRegex, (_match, importsStr) => {
        // Parse the imported variables
        // e.g. " Flex, Box, Button "
        const imports = importsStr
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);

        const layoutImports = [];
        const radixImports = [];
        const _overlayImports = []; // For future use

        for (const imp of imports) {
            if (["Flex", "Box", "Grid", "Container"].includes(imp)) {
                layoutImports.push(imp);
            } else {
                radixImports.push(imp);
            }
        }

        let newImportsBlock = "";

        // Output existing radix imports if any remain
        if (radixImports.length > 0) {
            newImportsBlock += `import { ${radixImports.join(", ")} } from "@radix-ui/themes";\n`;
        }

        // Output new layout imports
        for (const layoutImp of layoutImports) {
            // Need to determine relative path or use alias
            newImportsBlock += `import { ${layoutImp} } from "@/components/layout/${layoutImp}";\n`;
        }

        return newImportsBlock.trim();
    });

    if (content !== originalContent) {
        fs.writeFileSync(filePath, content, "utf-8");
        updatedFilesCount++;
    }
}

console.log(`Updated ${updatedFilesCount} files.`);
