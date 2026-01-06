#!/usr/bin/env node

/**
 * Simple script to help add dark mode classes to existing components
 * This is a helper script - you'll still need to manually review and adjust
 */

const fs = require('fs');
const path = require('path');

// Common patterns to add dark mode classes to
const darkModeMappings = {
  // Backgrounds
  'bg-white': 'bg-white dark:bg-neutral-900',
  'bg-gray-50': 'bg-gray-50 dark:bg-neutral-800',
  'bg-gray-100': 'bg-gray-100 dark:bg-neutral-700',
  'bg-gray-200': 'bg-gray-200 dark:bg-neutral-600',
  
  // Text colors
  'text-gray-800': 'text-gray-800 dark:text-gray-100',
  'text-gray-700': 'text-gray-700 dark:text-gray-200',
  'text-gray-600': 'text-gray-600 dark:text-gray-300',
  'text-gray-500': 'text-gray-500 dark:text-gray-400',
  'text-gray-900': 'text-gray-900 dark:text-gray-50',
  
  // Borders
  'border-gray-200': 'border-gray-200 dark:border-neutral-700',
  'border-gray-300': 'border-gray-300 dark:border-neutral-600',
  
  // Hover states
  'hover:bg-gray-50': 'hover:bg-gray-50 dark:hover:bg-neutral-800',
  'hover:bg-gray-100': 'hover:bg-gray-100 dark:hover:bg-neutral-700',
};

function addDarkModeToFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // Apply mappings
    for (const [light, dark] of Object.entries(darkModeMappings)) {
      const regex = new RegExp(`\\b${light}\\b`, 'g');
      if (content.includes(light) && !content.includes(dark)) {
        content = content.replace(regex, dark);
        modified = true;
      }
    }
    
    if (modified) {
      console.log(`✅ Updated: ${filePath}`);
      // Uncomment the next line to actually write the changes
      // fs.writeFileSync(filePath, content);
    } else {
      console.log(`⏭️  No changes needed: ${filePath}`);
    }
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
  }
}

// Example usage - you can specify files to process
const filesToProcess = [
  // Add your file paths here
  // 'app/[locale]/dashboard/page.tsx',
  // 'app/[locale]/opportunities/page.tsx',
  // etc.
];

if (filesToProcess.length === 0) {
  console.log(`
🌙 Dark Mode Helper Script

This script helps add dark mode classes to existing components.

Usage:
1. Add file paths to the filesToProcess array
2. Uncomment the fs.writeFileSync line to actually make changes
3. Run: node scripts/add-dark-mode.js

Current mappings:
${Object.entries(darkModeMappings).map(([light, dark]) => `  ${light} → ${dark}`).join('\n')}
  `);
} else {
  filesToProcess.forEach(addDarkModeToFile);
}
