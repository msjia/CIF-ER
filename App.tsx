import React, { useState, useEffect } from 'react';
import { parseSQL, INITIAL_SQL } from './services/sqlParser';
import ERDiagram from './components/ERDiagram';
import { TableDefinition, ViewMode } from './types';
import { Database, Code, Upload, RefreshCw, LayoutDashboard } from 'lucide-react';

const App = () => {
  const [sqlInput, setSqlInput] = useState<string>(INITIAL_SQL);
  const [parsedTables, setParsedTables] = useState<TableDefinition[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.EDITOR);
  const [error, setError] = useState<string | null>(null);

  const handleParse = () => {
    try {
      const tables = parseSQL(sqlInput);
      if (tables.length === 0) {
        setError("No tables found in the provided SQL.");
      } else {
        setParsedTables(tables);
        setError(null);
        setViewMode(ViewMode.EDITOR);
      }
    } catch (e) {
      setError("Failed to parse SQL. Please check the syntax.");
    }
  };

  useEffect(() => {
    handleParse();
  }, []);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setSqlInput(content);
        // Automatically parse after upload
        setTimeout(() => {
            const tables = parseSQL(content);
            setParsedTables(tables);
        }, 100);
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-slate-50 text-slate-900 font-sans">
      {/* Header */}
      <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6 shadow-sm z-10">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white shadow-md shadow-blue-200">
            <Database size={18} />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-slate-900">SchemaViz</h1>
            <p className="text-xs text-slate-500 font-medium">SQL DDL to ER Diagram</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
              onClick={() => setViewMode(ViewMode.EDITOR)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                viewMode === ViewMode.EDITOR
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <LayoutDashboard size={16} />
              Diagram
            </button>
            <button
              onClick={() => setViewMode(ViewMode.SQL_INPUT)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                viewMode === ViewMode.SQL_INPUT
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <Code size={16} />
              SQL Input
            </button>
          </div>
          
          <a 
            href="#" 
            className="ml-2 rounded-full bg-slate-100 p-2 text-slate-500 hover:bg-blue-50 hover:text-blue-600 transition-colors"
            title="Reload Default Data"
            onClick={(e) => {
                e.preventDefault();
                setSqlInput(INITIAL_SQL);
                handleParse();
            }}
          >
            <RefreshCw size={18} />
          </a>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 relative overflow-hidden">
        {viewMode === ViewMode.EDITOR ? (
            <div className="w-full h-full">
                {parsedTables.length > 0 ? (
                    <ERDiagram tables={parsedTables} />
                ) : (
                     <div className="flex flex-col items-center justify-center h-full text-slate-400">
                        <Database size={48} className="mb-4 opacity-20" />
                        <p>No tables loaded. Go to SQL Input to add data.</p>
                     </div>
                )}
            </div>
        ) : (
          <div className="container mx-auto max-w-5xl h-full p-6 flex flex-col gap-4">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex-1 flex flex-col overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50">
                    <h2 className="font-semibold text-slate-700">SQL DDL Input</h2>
                    <div className="flex gap-3">
                         <label className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-600 cursor-pointer hover:border-blue-400 hover:text-blue-600 transition-colors">
                            <Upload size={16} />
                            Upload .sql
                            <input type="file" accept=".sql,.txt" className="hidden" onChange={handleFileUpload} />
                        </label>
                        <button 
                            onClick={handleParse}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-colors shadow-sm shadow-blue-200"
                        >
                            Parse & Visualize
                        </button>
                    </div>
                </div>
                
                <div className="relative flex-1">
                    <textarea
                        className="w-full h-full p-4 font-mono text-sm resize-none focus:outline-none focus:bg-blue-50/10 text-slate-700"
                        value={sqlInput}
                        onChange={(e) => setSqlInput(e.target.value)}
                        placeholder="Paste your CREATE TABLE statements here..."
                        spellCheck={false}
                    />
                </div>
            </div>
            
            {error && (
                <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg border border-red-200 text-sm flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
                    <div className="w-2 h-2 rounded-full bg-red-500" />
                    {error}
                </div>
            )}
            
            <div className="text-center text-xs text-slate-400 py-2">
                Supports MySQL syntax. Paste definitions to generate nodes.
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;