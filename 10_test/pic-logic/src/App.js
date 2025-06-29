import React, { useState, useCallback, useRef } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import { createWorker } from 'tesseract.js';

const initialGrid = (rows, cols) => Array.from({ length: rows }, () => Array(cols).fill(0));

function App() {
  const [rows, setRows] = useState(10);
  const [cols, setCols] = useState(10);
  const [rowHints, setRowHints] = useState(Array(10).fill(''));
  const [colHints, setColHints] = useState(Array(10).fill(''));
  const [grid, setGrid] = useState(initialGrid(10, 10));
  const [isSolved, setIsSolved] = useState(false);
  const [loading, setLoading] = useState(false);
  const rowFileRef = useRef(null);
  const colFileRef = useRef(null);

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

  const handleImageUpload = async (type, file) => {
    if (!file) return;
    setLoading(true);
    try {
      const worker = await createWorker('eng');
      const { data: { text } } = await worker.recognize(file);
      await worker.terminate();

      const lines = text.split('\n').map(line => line.trim().replace(/[^0-9 ]/g, ''));
      if (type === 'row') {
        const newHints = [...rowHints];
        lines.slice(0, rows).forEach((line, i) => {
          newHints[i] = line;
        });
        setRowHints(newHints);
      } else {
        const newHints = [...colHints];
        lines.slice(0, cols).forEach((line, i) => {
          newHints[i] = line;
        });
        setColHints(newHints);
      }
    } catch (error) {
      console.error('OCR Error:', error);
      alert('画像の解析中にエラーが発生しました。CSP(Content Security Policy)が原因である可能性があります。詳細は開発者コンソールを確認してください。');
    } finally {
      setLoading(false);
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
    <div className="container mt-4">
      {loading && (
        <div className="position-fixed top-0 start-0 vw-100 vh-100 d-flex justify-content-center align-items-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999 }}>
          <div className="spinner-border text-light" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      )}
      <h1 className="mb-4 text-center">イラストロジックソルバー</h1>

      <div className="card mb-4">
        <div className="card-body">
          <h5 className="card-title">設定</h5>
          <div className="row g-3 align-items-center">
            <div className="col-auto">
              <label htmlFor="rows" className="col-form-label">行数:</label>
            </div>
            <div className="col-auto">
              <input type="number" id="rows" className="form-control" value={rows} onChange={e => setRows(Number(e.target.value))} min="1" max="30" />
            </div>
            <div className="col-auto">
              <label htmlFor="cols" className="col-form-label">列数:</label>
            </div>
            <div className="col-auto">
              <input type="number" id="cols" className="form-control" value={cols} onChange={e => setCols(Number(e.target.value))} min="1" max="30" />
            </div>
            <div className="col-auto">
              <button className="btn btn-primary" onClick={handleSizeChange}>盤面を更新</button>
            </div>
          </div>
        </div>
      </div>

      <div className="row">
        <div className="col-md-6">
          <div className="card">
            <div className="card-body">
              <h5 className="card-title">ヒント入力</h5>
              <div className="mb-3">
                <button className="btn btn-outline-primary btn-sm mb-2" onClick={() => rowFileRef.current.click()}>行ヒントを画像から読み込む</button>
                <input type="file" ref={rowFileRef} style={{ display: 'none' }} accept="image/*" onChange={(e) => handleImageUpload('row', e.target.files[0])} />
                <h6>行のヒント</h6>
                <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '5px' }}>
                  {rowHints.map((hint, i) => (
                    <React.Fragment key={`row-${i}`}>
                      <label className="text-end pt-1">{i + 1}:</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        value={hint}
                        onChange={e => handleHintChange('row', i, e.target.value)}
                        placeholder="例: 3 1"
                      />
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-6">
          <div className="card">
            <div className="card-body">
               <h5 className="card-title invisible">ヒント入力</h5>
              <div className="mb-3">
                <button className="btn btn-outline-primary btn-sm mb-2" onClick={() => colFileRef.current.click()}>列ヒントを画像から読み込む</button>
                <input type="file" ref={colFileRef} style={{ display: 'none' }} accept="image/*" onChange={(e) => handleImageUpload('col', e.target.files[0])} />
                <h6>列のヒント</h6>
                 <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '5px' }}>
                  {colHints.map((hint, i) => (
                    <React.Fragment key={`col-${i}`}>
                      <label className="text-end pt-1">{i + 1}:</label>
                      <textarea
                        className="form-control form-control-sm"
                        value={hint}
                        onChange={e => handleHintChange('col', i, e.target.value)}
                        placeholder="例: 2 1"
                        rows="1"
                        style={{resize: 'none', overflowY: 'auto'}}
                      />
                    </React.Fragment>
                  ))}
                </div>
              </div>
               <div className="d-flex justify-content-end mt-3">
                <button className="btn btn-success me-2" onClick={handleSolve}>解決</button>
                <button className="btn btn-danger" onClick={handleClear}>クリア</button>
              </div>
            </div>
          </div>
        </div>
      </div>


      {isSolved && (
        <div className="mt-4">
          <h2 className="text-center">完成図</h2>
          <div className="d-flex justify-content-center">
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 25px)` }}>
              {grid.map((row, i) =>
                row.map((cell, j) => (
                  <div
                    key={`${i}-${j}`}
                    style={{
                      width: '25px',
                      height: '25px',
                      backgroundColor: cell === 1 ? 'black' : 'white',
                      border: '1px solid #ccc',
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
