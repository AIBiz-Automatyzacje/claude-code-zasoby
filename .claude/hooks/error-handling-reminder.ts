#!/usr/bin/env node
import { readFileSync, existsSync } from 'fs';
import { join, relative } from 'path';

// Stop event input structure
interface HookInput {
  session_id: string;
  transcript_path: string;
  cwd: string;
  permission_mode: string;
  hook_event_name: string;
}

interface EditedFile {
  timestamp: string;
  tool: string;
  path: string;
}

interface FileCategory {
  type: 'frontend' | 'edge-function' | 'other';
  relativePath: string;
}

interface Warning {
  type: 'forbidden' | 'missing';
  pattern: string;
  suggestion: string;
  line?: number;
}

interface FileAnalysis {
  file: EditedFile;
  category: FileCategory;
  warnings: Warning[];
}

// Wzorce do wykrywania - Frontend
const FRONTEND_FORBIDDEN = [
  { pattern: /console\.error\s*\(/g, suggestion: 'Użyj logger.error() z @/lib/logger' },
  { pattern: /console\.warn\s*\(/g, suggestion: 'Użyj logger.warn() z @/lib/logger' },
];

// Wzorce do wykrywania - Edge Functions
const EDGE_REQUIRED = [
  { pattern: /captureError\s*\(/g, name: 'captureError()' },
  { pattern: /await\s+flush\s*\(/g, name: 'await flush()' },
];

// Pliki do pominięcia
const SKIP_PATTERNS = [
  /\.test\.(ts|tsx)$/,
  /\.spec\.(ts|tsx)$/,
  /\.d\.ts$/,
  /node_modules/,
  /\.config\.(ts|js)$/,
  /vite\.config/,
  /tailwind\.config/,
  /tsconfig/,
];

function getFileCategory(filePath: string, projectDir: string): FileCategory | null {
  // Obsłuż zarówno ścieżki absolutne jak i względne
  let absolutePath = filePath;
  if (!filePath.startsWith('/')) {
    absolutePath = join(projectDir, filePath);
  }

  const relativePath = relative(projectDir, absolutePath);

  // Pomiń pliki testowe i konfiguracyjne
  if (SKIP_PATTERNS.some(pattern => pattern.test(relativePath))) {
    return null;
  }

  if (relativePath.startsWith('src/')) {
    return { type: 'frontend', relativePath };
  }

  if (relativePath.startsWith('supabase/functions/') && !relativePath.includes('_shared')) {
    return { type: 'edge-function', relativePath };
  }

  return { type: 'other', relativePath };
}

function checkFrontendFile(content: string): Warning[] {
  const warnings: Warning[] = [];

  for (const { pattern, suggestion } of FRONTEND_FORBIDDEN) {
    let match;
    const regex = new RegExp(pattern.source, 'g');

    while ((match = regex.exec(content)) !== null) {
      const beforeMatch = content.substring(0, match.index);
      const lineNumber = beforeMatch.split('\n').length;

      warnings.push({
        type: 'forbidden',
        pattern: match[0].trim(),
        suggestion,
        line: lineNumber,
      });
    }
  }

  return warnings;
}

function checkEdgeFunctionFile(content: string): Warning[] {
  const warnings: Warning[] = [];

  // Sprawdź czy to główny plik funkcji (ma Deno.serve)
  if (!content.includes('Deno.serve')) {
    return warnings;
  }

  // Sprawdź czy ma try-catch
  const hasTryCatch = content.includes('try {') || content.includes('try{');
  if (!hasTryCatch) {
    return warnings;
  }

  // Sprawdź wymagane wzorce
  for (const { pattern, name } of EDGE_REQUIRED) {
    if (!pattern.test(content)) {
      warnings.push({
        type: 'missing',
        pattern: name,
        suggestion: `Brak ${name} - wymagane w Edge Functions dla proper error handling`,
      });
    }
  }

  // Specjalne sprawdzenie: flush przed return w catch
  const catchBlocks = content.match(/catch\s*\([^)]*\)\s*\{[\s\S]*?\n\s*\}/g) || [];
  for (const catchBlock of catchBlocks) {
    if (catchBlock.includes('return') && !catchBlock.includes('flush')) {
      warnings.push({
        type: 'missing',
        pattern: 'await flush()',
        suggestion: 'Brak flush() przed return w catch block - eventy Sentry mogą nie zostać wysłane',
      });
    }
  }

  return warnings;
}

function formatOutput(analyses: FileAnalysis[]): string {
  // Filtruj tylko pliki z ostrzeżeniami
  const withWarnings = analyses.filter(a => a.warnings.length > 0);

  if (withWarnings.length === 0) {
    return '';
  }

  let output = '\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
  output += '⚠️  ERROR HANDLING CHECK\n';
  output += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';

  // Grupuj po typie
  const frontendAnalyses = withWarnings.filter(a => a.category.type === 'frontend');
  const edgeFunctionAnalyses = withWarnings.filter(a => a.category.type === 'edge-function');

  if (frontendAnalyses.length > 0) {
    output += '📁 FRONTEND (src/)\n';
    output += `   ${frontendAnalyses.length} plik(ów) z ostrzeżeniami\n\n`;

    for (const analysis of frontendAnalyses) {
      output += `   ${analysis.category.relativePath}\n`;
      for (const w of analysis.warnings) {
        if (w.line) {
          output += `     Linia ${w.line}: ${w.pattern}\n`;
        }
        output += `     → ${w.suggestion}\n`;
      }
      output += '\n';
    }
  }

  if (edgeFunctionAnalyses.length > 0) {
    output += '📁 EDGE FUNCTIONS (supabase/functions/)\n';
    output += `   ${edgeFunctionAnalyses.length} plik(ów) z ostrzeżeniami\n\n`;

    for (const analysis of edgeFunctionAnalyses) {
      output += `   ${analysis.category.relativePath}\n`;
      for (const w of analysis.warnings) {
        output += `     ${w.pattern}\n`;
        output += `     → ${w.suggestion}\n`;
      }
      output += '\n';
    }
  }

  output += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';

  return output;
}

async function main() {
  try {
    // Odczytaj input z stdin (Stop event)
    const input = readFileSync(0, 'utf-8');
    const data: HookInput = JSON.parse(input);

    const { session_id } = data;
    const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();

    // Szukaj cache z edytowanymi plikami
    const cacheDir = join(projectDir, '.claude', 'tsc-cache', session_id || 'default');
    const trackingFile = join(cacheDir, 'edited-files.log');

    if (!existsSync(trackingFile)) {
      // Brak edytowanych plików w tej sesji
      process.exit(0);
    }

    // Odczytaj listę edytowanych plików
    const trackingContent = readFileSync(trackingFile, 'utf-8');
    const editedFiles: EditedFile[] = trackingContent
      .trim()
      .split('\n')
      .filter(line => line.length > 0)
      .map(line => {
        const [timestamp, tool, path] = line.split('\t');
        return { timestamp, tool, path };
      })
      .filter(file => file.path); // Filtruj niepoprawne wpisy

    if (editedFiles.length === 0) {
      process.exit(0);
    }

    // Deduplikuj pliki (ten sam plik mógł być edytowany wielokrotnie)
    const uniqueFiles = new Map<string, EditedFile>();
    for (const file of editedFiles) {
      uniqueFiles.set(file.path, file);
    }

    // Analizuj każdy plik
    const analyses: FileAnalysis[] = [];

    for (const file of Array.from(uniqueFiles.values())) {
      const category = getFileCategory(file.path, projectDir);
      if (!category || category.type === 'other') {
        continue;
      }

      // Sprawdź czy plik istnieje
      let absolutePath = file.path;
      if (!file.path.startsWith('/')) {
        absolutePath = join(projectDir, file.path);
      }

      if (!existsSync(absolutePath)) {
        continue;
      }

      // Odczytaj zawartość pliku
      const content = readFileSync(absolutePath, 'utf-8');

      // Sprawdź wzorce w zależności od typu pliku
      let warnings: Warning[] = [];

      if (category.type === 'frontend') {
        warnings = checkFrontendFile(content);
      } else if (category.type === 'edge-function') {
        warnings = checkEdgeFunctionFile(content);
      }

      if (warnings.length > 0) {
        analyses.push({ file, category, warnings });
      }
    }

    // Wyświetl ostrzeżenia
    const output = formatOutput(analyses);
    if (output) {
      console.log(output);
    }

    process.exit(0);
  } catch (err) {
    // Silent fail - nie blokujemy workflow
    process.exit(0);
  }
}

main().catch(() => {
  process.exit(0);
});
