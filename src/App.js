import React, { useState, useCallback } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';

const initialGrid = (rows, cols) => Array.from({ length: rows }, () => Array(cols).fill(0));

function App() {
  const [rows, setRows] = useState(10);
  const [cols, setCols] = useState(10);
  const [rowHints, setRowHints] = useState(Array(10).fill(''));
  const [colHints, setColHints] = useState(Array(10).fill(''));
  const [grid, setGrid] = useState(initialGrid(10, 10));
  const [isSolved, setIsSolved] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSizeChange = () => {
    const newRowHints = Array(Number(rows)).fill('');
    const newColHints = Array(Number(cols)).fill('');
    setRowHints(newRowHints);
    setColHints(newColHints);
    setGrid(initialGrid(Number(rows), Number(cols)));
    setIsSolved(false);
  };

  const handleHintChange = (type, index, value) => {
    if (type === 'row') {
      const newHints = [...rowHints];
      newHints[index] = value;
      setRowHints(newHints);
    } else {
      const newHints = [...colHints];
      newHints[index] = value;
      setColHints(newHints);
    }
  };

  
  
  const parseHints = (hints) => {
      return hints.map(hint => hint.split(/[ ,]+/).map(Number).filter(n => n > 0));
  };

  const solveLogic = useCallback(() => {
    const parsedRowHints = parseHints(rowHints);
    const parsedColHints = parseHints(colHints);
    
    let newGrid = initialGrid(rows, cols);
    let changed = true;

    const getLinePossibilities = (hints, length) => {
        const key = `${hints.join(',')}-${length}`;
        if (memo[key]) return memo[key];

        const possibilities = [];
        const generate = (index, currentLine) => {
            if (index === hints.length) {
                if (currentLine.length <= length) {
                    const filledLine = [...currentLine, ...Array(length - currentLine.length).fill(-1)];
                    possibilities.push(filledLine);
                }
                return;
            }

            const hint = hints[index];
            const remainingHints = hints.slice(index + 1);
            const minRemainingLength = remainingHints.reduce((sum, h) => sum + h + 1, 0) -1;

            const start = currentLine.length > 0 ? currentLine.length + 1 : 0;
            for (let i = start; i <= length - minRemainingLength - hint; i++) {
                const nextLine = [...currentLine, ...Array(i - currentLine.length).fill(-1), ...Array(hint).fill(1)];
                generate(index + 1, nextLine);
            }
        };
        generate(0, []);
        memo[key] = possibilities;
        return possibilities;
    };
    const memo = {};


    for (let iter = 0; iter < rows * cols && changed; iter++) {
        changed = false;
        
        // Row-wise check
        for (let i = 0; i < rows; i++) {
            if (parsedRowHints[i].length === 0) continue;
            const possibilities = getLinePossibilities(parsedRowHints[i], cols);
            const filteredPossibilities = possibilities.filter(p => {
                for(let j=0; j<cols; j++) {
                    if(newGrid[i][j] !== 0 && newGrid[i][j] !== p[j]) return false;
                }
                return true;
            });

            if (filteredPossibilities.length > 0) {
                const commonLine = Array(cols).fill(0);
                for(let j=0; j<cols; j++) {
                    const firstVal = filteredPossibilities[0][j];
                    if (filteredPossibilities.every(p => p[j] === firstVal)) {
                        commonLine[j] = firstVal;
                    }
                }

                for (let j = 0; j < cols; j++) {
                    if (newGrid[i][j] === 0 && commonLine[j] !== 0) {
                        newGrid[i][j] = commonLine[j];
                        changed = true;
                    }
                }
            }
        }

        // Col-wise check
        for (let j = 0; j < cols; j++) {
            if (parsedColHints[j].length === 0) continue;
            const currentCol = newGrid.map(row => row[j]);
            const possibilities = getLinePossibilities(parsedColHints[j], rows);
            const filteredPossibilities = possibilities.filter(p => {
                for(let i=0; i<rows; i++) {
                    if(currentCol[i] !== 0 && currentCol[i] !== p[i]) return false;
                }
                return true;
            });
            
            if (filteredPossibilities.length > 0) {
                const commonLine = Array(rows).fill(0);
                 for(let i=0; i<rows; i++) {
                    const firstVal = filteredPossibilities[0][i];
                    if (filteredPossibilities.every(p => p[i] === firstVal)) {
                        commonLine[i] = firstVal;
                    }
                }

                for (let i = 0; i < rows; i++) {
                    if (newGrid[i][j] === 0 && commonLine[i] !== 0) {
                        newGrid[i][j] = commonLine[i];
                        changed = true;
                    }
                }
            }
        }
    }

    setGrid(newGrid);
    setIsSolved(true);
  }, [rows, cols, rowHints, colHints]);


  const handleSolve = () => {
    solveLogic();
  };

  const handleClear = () => {
    setRowHints(Array(rows).fill(''));
    setColHints(Array(cols).fill(''));
    setGrid(initialGrid(rows, cols));
    setIsSolved(false);
  };

  return (
    <div className="container py-4">
      
      <h1 className="text-center mb-5 fw-bold text-primary">イラストロジックソルバー</h1>

      <div className="card shadow-sm mb-4">
        <div className="card-body">
          <h5 className="card-title text-center mb-4 text-light">設定</h5>
          <div className="row g-3 align-items-center justify-content-center">
            <div className="col-md-auto">
              <label htmlFor="rows" className="form-label mb-0">行数:</label>
              <input type="number" id="rows" className="form-control form-control-lg" value={rows} onChange={e => setRows(Number(e.target.value))} min="1" max="30" />
            </div>
            <div className="col-md-auto">
              <label htmlFor="cols" className="form-label mb-0">列数:</label>
              <input type="number" id="cols" className="form-control form-control-lg" value={cols} onChange={e => setCols(Number(e.target.value))} min="1" max="30" />
            </div>
            <div className="col-md-auto d-flex align-items-end">
              <button className="btn btn-primary btn-lg w-100" onClick={handleSizeChange}>盤面を更新</button>
            </div>
          </div>
        </div>
      </div>

      <div className="row">
        <div className="col-md-6">
          <div className="card shadow-sm">
            <div className="card-body">
              <h5 className="card-title text-center mb-4 text-light">行ヒント入力</h5>
              <div className="mb-3">
                <div className="row g-2">
                  {rowHints.map((hint, i) => (
                    <div className="col-12" key={`row-${i}`}>
                      <div className="input-group input-group-sm">
                        <span className="input-group-text" style={{ width: '40px' }}>{i + 1}:</span>
                        <input
                          type="text"
                          className="form-control"
                          value={hint}
                          onChange={e => handleHintChange('row', i, e.target.value)}
                          placeholder="例: 3 1"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-6">
          <div className="card shadow-sm">
            <div className="card-body">
              <h5 className="card-title text-center mb-4 text-light">列ヒント入力</h5>
              <div className="mb-3">
                <div className="row g-2">
                  {colHints.map((hint, i) => (
                    <div className="col-12" key={`col-${i}`}>
                      <div className="input-group input-group-sm">
                        <span className="input-group-text" style={{ width: '40px' }}>{i + 1}:</span>
                        <textarea
                          className="form-control"
                          value={hint}
                          onChange={e => handleHintChange('col', i, e.target.value)}
                          placeholder="例: 2 1"
                          rows="1"
                          style={{ resize: 'none', overflowY: 'auto' }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="d-flex justify-content-center mt-4">
                <button className="btn btn-success btn-lg me-3" onClick={handleSolve}>解決</button>
                <button className="btn btn-danger btn-lg" onClick={handleClear}>クリア</button>
              </div>
            </div>
          </div>
        </div>
      </div>


      {isSolved && (
        <div className="mt-5">
          <h2 className="text-center mb-4 text-light">完成図</h2>
          <div className="d-flex justify-content-center">
            <div className="grid-container" style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 25px)` }}>
              {grid.map((row, i) =>
                row.map((cell, j) => (
                  <div
                    key={`${i}-${j}`}
                    className={`grid-cell ${cell === 1 ? 'filled' : 'empty'}`}
                    style={{
                      width: '25px',
                      height: '25px',
                    }}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
