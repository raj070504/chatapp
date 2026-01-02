
import React, { useState, useEffect, useRef } from 'react';
import '../styles/MathChat.css';
 const loadMathJax = () => {
    if (!window.MathJax) {
      window.MathJax = {
        tex: {
          inlineMath: [['$', '$'], ['\\(', '\\)']],
          displayMath: [['$$', '$$'], ['\\[', '\\]']],
          processEscapes: true,
          processEnvironments: true
        },
        options: {
          skipHtmlTags: ['script', 'noscript', 'style', 'textarea', 'pre']
        },
        startup: {
          pageReady: () => {
            return window.MathJax.startup.defaultPageReady();
          }
        }
      };
  
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js';
      script.async = true;
      document.head.appendChild(script);
    }
  };
   
  const renderMath = () => {
    if (window.MathJax && window.MathJax.typesetPromise) {
      window.MathJax.typesetPromise().catch((err) => console.log('MathJax error:', err));
    }
  };
  // Add helper function to format matrix
  const formatMatrix = (matrix) => {
    return matrix.map(row => 
      row.map(val => {
        const rounded = Math.abs(val) < 1e-10 ? 0 : Math.round(val * 10000) / 10000;
        return rounded.toString().padStart(10);
      }).join(' ')
    ).join('\n');
  };

// Add after parseMatrixInput function

function parseSplineInput(input) {
    try {
        // Expected format: (x0,y0) (x1,y1) (x2,y2) ...
        const points = [];
        const matches = input.matchAll(/\(([^,]+),([^)]+)\)/g);
        
        for (const match of matches) {
            const x = parseFloat(match[1].trim());
            const y = parseFloat(match[2].trim());
            
            if (isNaN(x) || isNaN(y)) {
                throw new Error(`Invalid point: (${match[1]},${match[2]})`);
            }
            
            points.push({ x, y });
        }
        
        if (points.length < 3) {
            throw new Error("Need at least 3 points for spline interpolation");
        }
        
        // Sort points by x value
        points.sort((a, b) => a.x - b.x);
        
        return { points, success: true };
    } catch (error) {
        return { error: error.message, success: false };
    }
}

function cubicSpline(points) {
    const n = points.length - 1;
    const steps = [];
    
    // Step 1: Calculate h values
    const h = [];
    for (let i = 0; i < n; i++) {
        h[i] = points[i + 1].x - points[i].x;
    }
    
    let tableHTML = '<table style="width: 100%; border-collapse: collapse; margin: 20px 0;">';
    tableHTML += '<tr style="background-color: #f0f0f0;"><th style="border: 1px solid #ddd; padding: 10px;">i</th><th style="border: 1px solid #ddd; padding: 10px;">x<sub>i</sub></th><th style="border: 1px solid #ddd; padding: 10px;">y<sub>i</sub></th><th style="border: 1px solid #ddd; padding: 10px;">h<sub>i</sub></th></tr>';
    
    for (let i = 0; i <= n; i++) {
        tableHTML += `<tr><td style="border: 1px solid #ddd; padding: 10px; text-align: center;">${i}</td>`;
        tableHTML += `<td style="border: 1px solid #ddd; padding: 10px; text-align: center;">${points[i].x.toFixed(4)}</td>`;
        tableHTML += `<td style="border: 1px solid #ddd; padding: 10px; text-align: center;">${points[i].y.toFixed(4)}</td>`;
        tableHTML += `<td style="border: 1px solid #ddd; padding: 10px; text-align: center;">${i < n ? h[i].toFixed(4) : '-'}</td></tr>`;
    }
    tableHTML += '</table>';
    
    steps.push({
        description: "Input Points and h values",
        content: tableHTML,
        detail: `h<sub>i</sub> = x<sub>i+1</sub> - x<sub>i</sub>`
    });
    
    // Step 2: Build tridiagonal system for natural spline
    const A = Array(n + 1).fill(0).map(() => Array(n + 1).fill(0));
    const b = Array(n + 1).fill(0);
    
    // Natural boundary conditions: M0 = Mn = 0
    A[0][0] = 1;
    A[n][n] = 1;
    
    for (let i = 1; i < n; i++) {
        A[i][i - 1] = h[i - 1];
        A[i][i] = 2 * (h[i - 1] + h[i]);
        A[i][i + 1] = h[i];
        
        b[i] = 6 * ((points[i + 1].y - points[i].y) / h[i] - 
                    (points[i].y - points[i - 1].y) / h[i - 1]);
    }
    
    steps.push({
        description: "Tridiagonal System",
        content: `$$${matrixToLatex22(A.map((row, i) => [...row, b[i]]))}$$`,
        detail: "System AM = b for second derivatives M"
    });
    
    // Step 3: Solve tridiagonal system (Thomas algorithm)
    const M = thomasAlgorithm(A, b);
    
    let mTableHTML = '<table style="width: 50%; border-collapse: collapse; margin: 20px auto;">';
    mTableHTML += '<tr style="background-color: #f0f0f0;"><th style="border: 1px solid #ddd; padding: 10px;">i</th><th style="border: 1px solid #ddd; padding: 10px;">M<sub>i</sub></th></tr>';
    
    for (let i = 0; i <= n; i++) {
        mTableHTML += `<tr><td style="border: 1px solid #ddd; padding: 10px; text-align: center;">${i}</td>`;
        mTableHTML += `<td style="border: 1px solid #ddd; padding: 10px; text-align: center;">${M[i].toFixed(6)}</td></tr>`;
    }
    mTableHTML += '</table>';
    
    steps.push({
        description: "Second Derivatives (M values)",
        content: mTableHTML,
        detail: ""
    });
    
    // Step 4: Calculate spline coefficients
    const splines = [];
    for (let i = 0; i < n; i++) {
        const a = points[i].y;
        const b_coef = (points[i + 1].y - points[i].y) / h[i] - h[i] * (2 * M[i] + M[i + 1]) / 6;
        const c = M[i] / 2;
        const d = (M[i + 1] - M[i]) / (6 * h[i]);
        
        splines.push({ a, b: b_coef, c, d, x0: points[i].x });
    }
    
    let splineHTML = '<div style="margin: 20px 0;">';
    for (let i = 0; i < n; i++) {
        splineHTML += `<p style="margin: 10px 0;">S<sub>${i}</sub>(x) = ${splines[i].a.toFixed(4)} + ${splines[i].b.toFixed(4)}(x - ${splines[i].x0.toFixed(4)}) + ${splines[i].c.toFixed(4)}(x - ${splines[i].x0.toFixed(4)})<sup>2</sup> + ${splines[i].d.toFixed(4)}(x - ${splines[i].x0.toFixed(4)})<sup>3</sup></p>`;
        splineHTML += `<p style="margin: 5px 0 15px 20px; color: #666;">for x ∈ [${points[i].x.toFixed(4)}, ${points[i + 1].x.toFixed(4)}]</p>`;
    }
    splineHTML += '</div>';
    
    steps.push({
        description: "Cubic Spline Equations",
        content: splineHTML,
        detail: "S<sub>i</sub>(x) = a + b(x-x<sub>i</sub>) + c(x-x<sub>i</sub>)<sup>2</sup> + d(x-x<sub>i</sub>)<sup>3</sup>"
    });
    
    return { steps, splines };
}

function thomasAlgorithm(A, b) {
    const n = b.length;
    const c = Array(n).fill(0);
    const d = Array(n).fill(0);
    const x = Array(n).fill(0);
    
    // Forward elimination
    c[0] = A[0][1] / A[0][0];
    d[0] = b[0] / A[0][0];
    
    for (let i = 1; i < n; i++) {
        const denom = A[i][i] - A[i][i - 1] * c[i - 1];
        if (i < n - 1) {
            c[i] = A[i][i + 1] / denom;
        }
        d[i] = (b[i] - A[i][i - 1] * d[i - 1]) / denom;
    }
    
    // Back substitution
    x[n - 1] = d[n - 1];
    for (let i = n - 2; i >= 0; i--) {
        x[i] = d[i] - c[i] * x[i + 1];
    }
    
    return x;
}
// helper function 
  function split_equations(equations) {
        try {
            const eqArray = equations.split(';').map(eq => eq.trim()).filter(eq => eq);
            
            if (eqArray.length === 0) {
                throw new Error("No equations found");
            }

            const matrix = [];
            let numVariables = null;
            let allVariables = new Set();

            // First pass: collect all variables
            for (let eq of eqArray) {
                const [leftSide] = eq.split('=').map(s => s.trim());
                const terms = leftSide.match(/[+-]?[^+-]+/g) || [];
                
                for (let term of terms) {
                    term = term.trim();
                    const match = term.match(/^([+-]?\d*\.?\d*)\s*([a-z])$/i);
                    if (match) {
                        allVariables.add(match[2]);
                    }
                }
            }

            const sortedVariables = Array.from(allVariables).sort();
            numVariables = sortedVariables.length;

            // Second pass: build matrix
            for (let eq of eqArray) {
                const [leftSide, rightSide] = eq.split('=').map(s => s.trim());
                
                if (!rightSide) {
                    throw new Error(`Invalid equation format: ${eq}`);
                }

                const constant = parseFloat(rightSide);
                
                // Extract coefficients
                const coefficients = {};
                sortedVariables.forEach(v => coefficients[v] = 0);
                
                const terms = leftSide.match(/[+-]?[^+-]+/g) || [];
                
                for (let term of terms) {
                    term = term.trim();
                    const match = term.match(/^([+-]?\d*\.?\d*)\s*([a-z])$/i);
                    
                    if (match) {
                        let coef = match[1];
                        const variable = match[2];
                        
                        if (coef === '' || coef === '+') coef = '1';
                        else if (coef === '-') coef = '-1';
                        
                        coefficients[variable] = parseFloat(coef);
                    }
                }

                const row = sortedVariables.map(v => coefficients[v]);
                row.push(constant);
                matrix.push(row);
            }

            // Check if matrix is square (excluding the constant column)
            if (matrix.length !== numVariables) {
                throw new Error(`Matrix is not square. Found ${matrix.length} equations but ${numVariables} variables. Need ${numVariables} equations.`);
            }

            return { matrix, success: true };
            
        } catch (error) {
            return { error: error.message, success: false };
        }
    }

    function matrixToLatex22(matrix) {
        let latex = '\\begin{bmatrix}\n';
        for (let i = 0; i < matrix.length; i++) {
            latex += matrix[i].map(val => {
                // Round to 4 decimal places for display
                const rounded = Math.abs(val) < 1e-10 ? 0 : Math.round(val * 10000) / 10000;
                return rounded;
            }).join(' & ');
            if (i < matrix.length - 1) {
                latex += ' \\\\\n';
            }
        }
        latex += '\n\\end{bmatrix}';
        return latex;
    }

    function gaussianElimination(matrix) {
        const steps = [];
        const n = matrix.length;
        
        // Deep copy the matrix
        let currentMatrix = matrix.map(row => [...row]);
        
        steps.push({
            description: "Initial Augmented Matrix",
            matrix: currentMatrix.map(row => [...row]),
            operation: ""
        });

        for (let i = 0; i < n; i++) {
            const pivot = currentMatrix[i][i];
            
            if (Math.abs(pivot) < 1e-10) {
                throw new Error(`Zero pivot encountered at row ${i + 1}. Cannot proceed.`);
            }

            if (Math.abs(pivot - 1) > 1e-10) {
                for (let j = 0; j < currentMatrix[i].length; j++) {
                    currentMatrix[i][j] /= pivot;
                }
                
                steps.push({
                    description: `Make pivot element 1`,
                    matrix: currentMatrix.map(row => [...row]),
                    operation: `R${i + 1} = R${i + 1} / (${pivot.toFixed(4)})`
                });
            }

            // Step 2: Eliminate all elements below the pivot
            for (let k = i + 1; k < n; k++) {
                const factor = currentMatrix[k][i];
                
                if (Math.abs(factor) > 1e-10) {
                    for (let j = 0; j < currentMatrix[k].length; j++) {
                        currentMatrix[k][j] -= factor * currentMatrix[i][j];
                    }
                    
                    steps.push({
                        description: `Eliminate element at position (${k + 1}, ${i + 1})`,
                        matrix: currentMatrix.map(row => [...row]),
                        operation: `R${k + 1} = R${k + 1} - (${factor.toFixed(4)}) × R${i + 1}`
                    });
                }
            }
        }

        return steps;
    }


    function backSubstitution(matrix) {
        const n = matrix.length;
        const solutions = new Array(n);
        
        // Start from the last row and work backwards
        for (let i = n - 1; i >= 0; i--) {
            let sum = matrix[i][n]; // Start with the constant term
            
            // Subtract known values
            for (let j = i + 1; j < n; j++) {
                sum -= matrix[i][j] * solutions[j];
            }
            
            solutions[i] = sum / matrix[i][i];
        }
        
        return solutions;
    }
    
     function gaussJordan(matrix) {
        const steps = [];
        const n = matrix.length;
        
        let currentMatrix = matrix.map(row => [...row]);
        
        steps.push({
            description: "Initial Augmented Matrix",
            matrix: currentMatrix.map(row => [...row]),
            operation: ""
        });
    
        // Forward elimination
        for (let i = 0; i < n; i++) {
            const pivot = currentMatrix[i][i];
            
            if (Math.abs(pivot) < 1e-10) {
                throw new Error(`Zero pivot encountered at row ${i + 1}. Cannot proceed.`);
            }
    
            if (Math.abs(pivot - 1) > 1e-10) {
                for (let j = 0; j < currentMatrix[i].length; j++) {
                    currentMatrix[i][j] /= pivot;
                }
                
                steps.push({
                    description: `Make pivot element 1`,
                    matrix: currentMatrix.map(row => [...row]),
                    operation: `R${i + 1} = R${i + 1} / (${pivot.toFixed(4)})`
                });
            }
    
            for (let k = i + 1; k < n; k++) {
                const factor = currentMatrix[k][i];
                
                if (Math.abs(factor) > 1e-10) {
                    for (let j = 0; j < currentMatrix[k].length; j++) {
                        currentMatrix[k][j] -= factor * currentMatrix[i][j];
                    }
                    
                    steps.push({
                        description: `Eliminate element at position (${k + 1}, ${i + 1})`,
                        matrix: currentMatrix.map(row => [...row]),
                        operation: `R${k + 1} = R${k + 1} - (${factor.toFixed(4)}) × R${i + 1}`
                    });
                }
            }
        }
    
        // Backward elimination (make it diagonal)
        for (let i = n - 1; i >= 0; i--) {
            for (let k = i - 1; k >= 0; k--) {
                const factor = currentMatrix[k][i];
                
                if (Math.abs(factor) > 1e-10) {
                    for (let j = 0; j < currentMatrix[k].length; j++) {
                        currentMatrix[k][j] -= factor * currentMatrix[i][j];
                    }
                    
                    steps.push({
                        description: `Eliminate element at position (${k + 1}, ${i + 1})`,
                        matrix: currentMatrix.map(row => [...row]),
                        operation: `R${k + 1} = R${k + 1} - (${factor.toFixed(4)}) × R${i + 1}`
                    });
                }
            }
        }
    
        return steps;
    }
    
   function gaussJacobi(matrix, maxIterations = 50, tolerance = 0.0001) {
        const n = matrix.length;
        let x = new Array(n).fill(0);
        const steps = [];
        
        steps.push({
            iteration: 0,
            values: [...x],
            description: "Initial guess"
        });
    
        for (let iter = 1; iter <= maxIterations; iter++) {
            let xNew = new Array(n);
            let converged = true;
    
            for (let i = 0; i < n; i++) {
                let sum = matrix[i][n];
                
                for (let j = 0; j < n; j++) {
                    if (i !== j) {
                        sum -= matrix[i][j] * x[j];
                    }
                }
                
                xNew[i] = sum / matrix[i][i];
                
                if (Math.abs(xNew[i] - x[i]) > tolerance) {
                    converged = false;
                }
            }
    
            steps.push({
                iteration: iter,
                values: [...xNew],
                description: `Iteration ${iter}`
            });
    
            x = xNew;
    
            if (converged) {
                steps.push({
                    iteration: iter,
                    values: [...x],
                    description: `Converged after ${iter} iterations`
                });
                break;
            }
        }
    
        return { steps, solution: x };
    }
    
     function gaussSeidel(matrix, maxIterations = 50, tolerance = 0.0001) {
        const n = matrix.length;
        let x = new Array(n).fill(0);
        const steps = [];
        
        steps.push({
            iteration: 0,
            values: [...x],
            description: "Initial guess"
        });
    
        for (let iter = 1; iter <= maxIterations; iter++) {
            let xOld = [...x];
            let converged = true;
    
            for (let i = 0; i < n; i++) {
                let sum = matrix[i][n];
                
                for (let j = 0; j < n; j++) {
                    if (i !== j) {
                        sum -= matrix[i][j] * x[j];
                    }
                }
                
                x[i] = sum / matrix[i][i];
                
                if (Math.abs(x[i] - xOld[i]) > tolerance) {
                    converged = false;
                }
            }
    
            steps.push({
                iteration: iter,
                values: [...x],
                description: `Iteration ${iter}`
            });
    
            if (converged) {
                steps.push({
                    iteration: iter,
                    values: [...x],
                    description: `Converged after ${iter} iterations`
                });
                break;
            }
        }
    
        return { steps, solution: x };
    }
    
   function parseIntegrationInput(input) {
      try {
          console.log('Parsing integration input:', input);
          
          // Remove all spaces first for easier parsing
          const cleanInput = input.trim();
          
          // Find the three main parts by counting parentheses
          let parts = [];
          let currentPart = '';
          let parenCount = 0;
          let inParen = false;
          
          for (let i = 0; i < cleanInput.length; i++) {
              const char = cleanInput[i];
              
              if (char === '(') {
                  if (parenCount === 0 && currentPart.trim()) {
                      // Skip spaces between parts
                      continue;
                  }
                  parenCount++;
                  if (parenCount === 1) {
                      inParen = true;
                      continue; // Don't include the opening paren
                  }
                  currentPart += char;
              } else if (char === ')') {
                  parenCount--;
                  if (parenCount === 0) {
                      parts.push(currentPart.trim());
                      currentPart = '';
                      inParen = false;
                      continue; // Don't include the closing paren
                  }
                  currentPart += char;
              } else if (inParen) {
                  currentPart += char;
              }
          }
          
          if (parts.length !== 3) {
              throw new Error("Invalid format. Use: (a,b) (equation) (n). Example: (0,1) (1/(1+x^2)) (6)");
          }
          
          // Parse first part: a,b
          const intervalParts = parts[0].split(',');
          if (intervalParts.length !== 2) {
              throw new Error("Invalid interval format. Use: (a,b)");
          }
          
          const a = parseFloat(intervalParts[0].trim());
          const b = parseFloat(intervalParts[1].trim());
          const equation = parts[1].trim();
          const n = parseInt(parts[2].trim());
          
          if (isNaN(a) || isNaN(b)) {
              throw new Error("Invalid interval bounds");
          }
          
          if (isNaN(n) || n <= 0) {
              throw new Error("Number of intervals must be a positive integer");
          }
          
          if (n % 2 !== 0) {
              console.warn("For Simpson's rule, number of intervals should be even");
          }
          
          console.log('Parsed values:', { a, b, equation, n });
          return { a, b, equation, n, success: true };
          
      } catch (error) {
          console.error('Parse error:', error);
          return { error: error.message, success: false };
      }
  }
  // Evaluate mathematical expression
  function evaluateExpression(equation, x) {
      try {
          // Replace common math functions
          let expr = equation
              .replace(/\^/g, '**')
              .replace(/x/g, `(${x})`)
              .replace(/sin/g, 'Math.sin')
              .replace(/cos/g, 'Math.cos')
              .replace(/tan/g, 'Math.tan')
              .replace(/log/g, 'Math.log')
              .replace(/ln/g, 'Math.log')
              .replace(/sqrt/g, 'Math.sqrt')
              .replace(/exp/g, 'Math.exp')
              .replace(/abs/g, 'Math.abs');
          
          return eval(expr);
      } catch (error) {
          throw new Error(`Error evaluating expression at x=${x}: ${error.message}`);
      }
  }
  
  
  // Trapezoidal Rule
  function trapezoidalRule(a, b, equation, n) {
      const h = (b - a) / n;
      const steps = [];
      
      steps.push({
          description: "Formula",
          content: `$$\\int_{${a}}^{${b}} f(x)dx \\approx \\frac{h}{2}[f(x_0) + 2\\sum_{i=1}^{n-1}f(x_i) + f(x_n)]$$`,
          detail: `where h = \\frac{b-a}{n} = \\frac{${b}-${a}}{${n}} = ${h.toFixed(6)}`
      });
      
      // Calculate function values
      const values = [];
      let tableHTML = '<table style="width: 100%; border-collapse: collapse; margin: 20px 0;">';
      tableHTML += '<tr style="background-color: #f0f0f0;"><th style="border: 1px solid #ddd; padding: 10px;">i</th><th style="border: 1px solid #ddd; padding: 10px;">x<sub>i</sub></th><th style="border: 1px solid #ddd; padding: 10px;">f(x<sub>i</sub>)</th></tr>';
      
      for (let i = 0; i <= n; i++) {
          const xi = a + i * h;
          const fxi = evaluateExpression(equation, xi);
          values.push({ i, xi, fxi });
          
          tableHTML += `<tr><td style="border: 1px solid #ddd; padding: 10px; text-align: center;">${i}</td>`;
          tableHTML += `<td style="border: 1px solid #ddd; padding: 10px; text-align: center;">${xi.toFixed(6)}</td>`;
          tableHTML += `<td style="border: 1px solid #ddd; padding: 10px; text-align: center;">${fxi.toFixed(6)}</td></tr>`;
      }
      tableHTML += '</table>';
      
      steps.push({
          description: "Function Values",
          content: tableHTML,
          detail: `Equation: f(x) = ${equation}`
      });
      
      // Calculate sum
      let sum = values[0].fxi + values[n].fxi;
      let middleSum = 0;
      
      for (let i = 1; i < n; i++) {
          middleSum += values[i].fxi;
      }
      
      sum += 2 * middleSum;
      
      steps.push({
          description: "Calculation",
          content: `$$\\begin{align*}
          \\text{Sum} &= f(x_0) + 2\\sum_{i=1}^{${n-1}}f(x_i) + f(x_n) \\\\
          &= ${values[0].fxi.toFixed(6)} + 2(${middleSum.toFixed(6)}) + ${values[n].fxi.toFixed(6)} \\\\
          &= ${sum.toFixed(6)}
          \\end{align*}$$`,
          detail: ""
      });
      
      const result = (h / 2) * sum;
      
      steps.push({
          description: "Final Result",
          content: `$$\\int_{${a}}^{${b}} f(x)dx \\approx \\frac{${h.toFixed(6)}}{2} \\times ${sum.toFixed(6)} = ${result.toFixed(6)}$$`,
          detail: ""
      });
      
      return { steps, result };
  }
  
  // Simpson's 1/3 Rule
  function simpsonsRule(a, b, equation, n) {
      if (n % 2 !== 0) {
          throw new Error("Number of intervals must be even for Simpson's 1/3 rule");
      }
      
      const h = (b - a) / n;
      const steps = [];
      
      steps.push({
          description: "Formula",
          content: `$$\\int_{${a}}^{${b}} f(x)dx \\approx \\frac{h}{3}[f(x_0) + 4\\sum_{i=odd}f(x_i) + 2\\sum_{i=even}f(x_i) + f(x_n)]$$`,
          detail: `where h = \\frac{b-a}{n} = \\frac{${b}-${a}}{${n}} = ${h.toFixed(6)}`
      });
      
      // Calculate function values
      const values = [];
      let tableHTML = '<table style="width: 100%; border-collapse: collapse; margin: 20px 0;">';
      tableHTML += '<tr style="background-color: #f0f0f0;"><th style="border: 1px solid #ddd; padding: 10px;">i</th><th style="border: 1px solid #ddd; padding: 10px;">x<sub>i</sub></th><th style="border: 1px solid #ddd; padding: 10px;">f(x<sub>i</sub>)</th><th style="border: 1px solid #ddd; padding: 10px;">Multiplier</th></tr>';
      
      for (let i = 0; i <= n; i++) {
          const xi = a + i * h;
          const fxi = evaluateExpression(equation, xi);
          let multiplier = 1;
          
          if (i === 0 || i === n) {
              multiplier = 1;
          } else if (i % 2 === 1) {
              multiplier = 4;
          } else {
              multiplier = 2;
          }
          
          values.push({ i, xi, fxi, multiplier });
          
          tableHTML += `<tr><td style="border: 1px solid #ddd; padding: 10px; text-align: center;">${i}</td>`;
          tableHTML += `<td style="border: 1px solid #ddd; padding: 10px; text-align: center;">${xi.toFixed(6)}</td>`;
          tableHTML += `<td style="border: 1px solid #ddd; padding: 10px; text-align: center;">${fxi.toFixed(6)}</td>`;
          tableHTML += `<td style="border: 1px solid #ddd; padding: 10px; text-align: center;">${multiplier}</td></tr>`;
      }
      tableHTML += '</table>';
      
      steps.push({
          description: "Function Values",
          content: tableHTML,
          detail: `Equation: f(x) = ${equation}`
      });
      
      // Calculate sum
      let sum = values[0].fxi + values[n].fxi;
      let oddSum = 0;
      let evenSum = 0;
      
      for (let i = 1; i < n; i++) {
          if (i % 2 === 1) {
              oddSum += values[i].fxi;
          } else {
              evenSum += values[i].fxi;
          }
      }
      
      sum += 4 * oddSum + 2 * evenSum;
      
      steps.push({
          description: "Calculation",
          content: `$$\\begin{align*}
          \\text{Sum} &= f(x_0) + 4\\sum_{i=odd}f(x_i) + 2\\sum_{i=even}f(x_i) + f(x_n) \\\\
          &= ${values[0].fxi.toFixed(6)} + 4(${oddSum.toFixed(6)}) + 2(${evenSum.toFixed(6)}) + ${values[n].fxi.toFixed(6)} \\\\
          &= ${sum.toFixed(6)}
          \\end{align*}$$`,
          detail: ""
      });
      
      const result = (h / 3) * sum;
      
      steps.push({
          description: "Final Result",
          content: `$$\\int_{${a}}^{${b}} f(x)dx \\approx \\frac{${h.toFixed(6)}}{3} \\times ${sum.toFixed(6)} = ${result.toFixed(6)}$$`,
          detail: ""
      });
      
      return { steps, result };
  }

// Add this function after the gaussSeidel function and before parseIntegrationInput

function jacobiEigenvalue(matrix, maxIterations = 50, tolerance = 0.0001) {
    const n = matrix.length;
    
    // Check if matrix is symmetric
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            if (Math.abs(matrix[i][j] - matrix[j][i]) > 0.0001) {
                throw new Error("Matrix must be symmetric for Jacobi eigenvalue method");
            }
        }
    }
    
    // Initialize A and V
    let A = matrix.map(row => [...row]);
    let V = Array(n).fill(0).map((_, i) => 
        Array(n).fill(0).map((_, j) => i === j ? 1 : 0)
    );
    
    const steps = [];
    
    steps.push({
        iteration: 0,
        matrix: A.map(row => [...row]),
        eigenVectors: V.map(row => [...row]),
        description: "Initial matrix A and identity matrix V"
    });
    
    for (let iter = 1; iter <= maxIterations; iter++) {
        // Find largest off-diagonal element
        let maxVal = 0;
        let p = 0, q = 1;
        
        for (let i = 0; i < n; i++) {
            for (let j = i + 1; j < n; j++) {
                if (Math.abs(A[i][j]) > maxVal) {
                    maxVal = Math.abs(A[i][j]);
                    p = i;
                    q = j;
                }
            }
        }
        
        // Check convergence
        if (maxVal < tolerance) {
            const eigenvalues = A.map((row, i) => row[i]);
            steps.push({
                iteration: iter,
                matrix: A.map(row => [...row]),
                eigenVectors: V.map(row => [...row]),
                eigenvalues: eigenvalues,
                description: `Converged after ${iter - 1} iterations`,
                converged: true
            });
            return { steps, eigenvalues, eigenVectors: V };
        }
        
        // Calculate rotation angle
        const theta = 0.5 * Math.atan2(2 * A[p][q], A[q][q] - A[p][p]);
        const c = Math.cos(theta);
        const s = Math.sin(theta);
        
        // Create rotation matrix
        let R = Array(n).fill(0).map((_, i) => 
            Array(n).fill(0).map((_, j) => i === j ? 1 : 0)
        );
        R[p][p] = c;
        R[q][q] = c;
        R[p][q] = -s;
        R[q][p] = s;
        
        // Update A = R^T * A * R
        let temp = Array(n).fill(0).map(() => Array(n).fill(0));
        
        // R^T * A
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                temp[i][j] = 0;
                for (let k = 0; k < n; k++) {
                    temp[i][j] += R[k][i] * A[k][j];
                }
            }
        }
        
        // (R^T * A) * R
        let newA = Array(n).fill(0).map(() => Array(n).fill(0));
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                newA[i][j] = 0;
                for (let k = 0; k < n; k++) {
                    newA[i][j] += temp[i][k] * R[k][j];
                }
            }
        }
        
        // Update V = V * R
        let newV = Array(n).fill(0).map(() => Array(n).fill(0));
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                newV[i][j] = 0;
                for (let k = 0; k < n; k++) {
                    newV[i][j] += V[i][k] * R[k][j];
                }
            }
        }
        
        A = newA;
        V = newV;
        
        steps.push({
            iteration: iter,
            matrix: A.map(row => [...row]),
            eigenVectors: V.map(row => [...row]),
            maxOffDiagonal: maxVal,
            rotationAngle: theta,
            description: `Iteration ${iter}: Rotating elements (${p+1},${q+1})`
        });
    }
    
    const eigenvalues = A.map((row, i) => row[i]);
    return { steps, eigenvalues, eigenVectors: V };
}

function parseMatrixInput(input) {
    try {
        // Remove all spaces and split by semicolons
        const rows = input.trim().split(';');
        const matrix = [];
        
        for (let row of rows) {
            const elements = row.trim().split(/[\s,]+/).filter(x => x);
            const numRow = elements.map(x => {
                const num = parseFloat(x);
                if (isNaN(num)) {
                    throw new Error(`Invalid number: ${x}`);
                }
                return num;
            });
            matrix.push(numRow);
        }
        
        // Check if matrix is square
        const n = matrix.length;
        for (let row of matrix) {
            if (row.length !== n) {
                throw new Error("Matrix must be square");
            }
        }
        
        return { matrix, success: true };
    } catch (error) {
        return { error: error.message, success: false };
    }
}
const MathChat = () => {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [inputDisabled, setInputDisabled] = useState(true);
  const [currentState, setCurrentState] = useState('initial');
  const [selectedMethod, setSelectedMethod] = useState(null);
  const messagesEndRef = useRef(null);

useEffect(() => { 
  loadMathJax();
}, []);

useEffect(() => {
  renderMath();
}, [messages]);


// Add MathJax loading functions at the top level (outside component)

  const mathMethods = {
    '1': {
      name: 'Basic Math',
      description: 'Perform basic arithmetic operations',
      inputPrompt: 'Enter your mathematical expression (e.g., 2+2, 5*3, 10/2):'
    },
    '2': {
      name: 'Gaussian Elimination',
      description: 'Solve system of linear equations using Gaussian Elimination',
      inputPrompt: 'Enter equations separated by semicolons (e.g., 2x+5y+3z=10;3x-y+z=13;9x+5y-z=10):'
    },
    '3': {
      name: 'Gauss-Jordan',
      description: 'Solve system of linear equations using Gauss-Jordan method',
      inputPrompt: 'Enter equations separated by semicolons (e.g., 2x+5y+3z=10;3x-y+z=13;9x+5y-z=10):'
    },
    '4': {
      name: 'Gauss-Jacobi',
      description: 'Solve system of linear equations using Gauss-Jacobi iterative method',
      inputPrompt: 'Enter equations separated by semicolons (e.g., 2x+5y+3z=10;3x-y+z=13;9x+5y-z=10):'
    },
    '5': {
      name: 'Gauss-Seidel',
      description: 'Solve system of linear equations using Gauss-Seidel iterative method',
      inputPrompt: 'Enter equations separated by semicolons (e.g., 2x+5y+3z=10;3x-y+z=13;9x+5y-z=10):'
    },
    '6': {
      name: 'Trapezoidal Rule',
      description: 'Numerical integration using Trapezoidal Rule',
      inputPrompt: 'Enter in format: (a,b) (equation) (n). Example: (0,1) (1/(1+x^2)) (6)'
    },
    '7': {
      name: "Simpson's Rule",
      description: 'Numerical integration using Simpsons 1/3 Rule',
      inputPrompt: 'Enter in format: (a,b) (equation) (n). Example: (0,1) (1/(1+x^2)) (6)'
    },
    '8': {
    name: "Jacobi Eigenvalue",
    description: 'Find eigenvalues and eigenvectors using Jacobi method',
    inputPrompt: 'Enter symmetric matrix rows separated by semicolons (e.g., 4 1 1; 1 3 2; 1 2 3):'
  },
  '9': {
    name: "Spline",
    description: 'Spline',
    inputPrompt: 'enter value like  (0,0) (1,1) (2,0) (3,1)',
  }
  };

  useEffect(() => {
    // Initial welcome message
    addBotMessage('Welcome to Math Chat! 🧮');
    setTimeout(() => {
      showMainMenu();
    }, 1000);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const addBotMessage = (content, isOptions = false, delay = 0) => {
    setTimeout(() => {
      setMessages(prev => [...prev, {
        id: Date.now() + Math.random(),
        content,
        isUser: false,
        isOptions,
        timestamp: new Date()
      }]);
    }, delay);
  };

  const addUserMessage = (content) => {
    setMessages(prev => [...prev, {
      id: Date.now(),
      content,
      isUser: true,
      timestamp: new Date()
    }]);
  };

  const showMainMenu = () => {
    const menuContent = (
      <div className="math-options">
        <strong>Please select a mathematical method:</strong>
        <div className="options-container">
          {Object.entries(mathMethods).map(([key, method]) => (
            <button
              key={key}
              className="option-button"
              onClick={() => selectMethod(key)}
            >
              {key}. {method.name} - {method.description}
            </button>
          ))}
        </div>
      </div>
    );

    addBotMessage(menuContent, true, 500);
    setCurrentState('awaiting_choice');
    setInputDisabled(false);
  };

  const selectMethod = (methodKey) => {
    const method = mathMethods[methodKey];
    addUserMessage(methodKey);
    setInputDisabled(true);

    addBotMessage(`Great! You selected ${method.name}.`, false, 800);
    addBotMessage(method.inputPrompt, false, 1500);

    setTimeout(() => {
      setSelectedMethod(methodKey);
      setCurrentState('awaiting_input');
      setInputDisabled(false);
    }, 1500);
  };

  
  const processInput = async (input) => {
    addUserMessage(input);
    setInputDisabled(true);
  
    addBotMessage(`Processing your input with ${mathMethods[selectedMethod].name}...`, false, 800);
  
    setTimeout(async () => {
      try {
        let result;
        
        switch(selectedMethod) {
          case '1': // Basic Math
            try {
              const evalResult = eval(input);
              result = {
                success: true,
                content: (
                  <div className="result-container">
                    <h3>Result:</h3>
                    <div className="code-block">
                      <strong>{input} = {evalResult}</strong>
                    </div>
                  </div>
                )
              };
            } catch (error) {
              result = {
                success: false,
                error: 'Invalid mathematical expression'
              };
            }
            break;
  
          case '2': // Gaussian Elimination
            const gaussResult = split_equations(input);
            if (gaussResult.success) {
              try {
                const steps = gaussianElimination(gaussResult.matrix);
                const finalMatrix = steps[steps.length - 1].matrix;
                const solutions = backSubstitution(finalMatrix);
                
                result = {
                  success: true,
                  steps: steps,
                  solutions: solutions,
                  method: 'gaussian'
                };
              } catch (error) {
                result = { success: false, error: error.message };
              }
            } else {
              result = { success: false, error: gaussResult.error };
            }
            break;
  
          case '3': // Gauss-Jordan
            const jordanResult = split_equations(input);
            if (jordanResult.success) {
              try {
                const steps = gaussJordan(jordanResult.matrix);
                const finalMatrix = steps[steps.length - 1].matrix;
                const solutions = finalMatrix.map(row => row[row.length - 1]);
                
                result = {
                  success: true,
                  steps: steps,
                  solutions: solutions,
                  method: 'jordan'
                };
              } catch (error) {
                result = { success: false, error: error.message };
              }
            } else {
              result = { success: false, error: jordanResult.error };
            }
            break;
  
          case '4': // Gauss-Jacobi
            const jacobiResult = split_equations(input);
            if (jacobiResult.success) {
              try {
                const { steps, solution } = gaussJacobi(jacobiResult.matrix);
                
                result = {
                  success: true,
                  steps: steps,
                  solutions: solution,
                  method: 'jacobi'
                };
              } catch (error) {
                result = { success: false, error: error.message };
              }
            } else {
              result = { success: false, error: jacobiResult.error };
            }
            break;
  
          case '5': // Gauss-Seidel
            const seidelResult = split_equations(input);
            if (seidelResult.success) {
              try {
                const { steps, solution } = gaussSeidel(seidelResult.matrix);
                
                result = {
                  success: true,
                  steps: steps,
                  solutions: solution,
                  method: 'seidel'
                };
              } catch (error) {
                result = { success: false, error: error.message };
              }
            } else {
              result = { success: false, error: seidelResult.error };
            }
            break;
  
          case '6': // Trapezoidal Rule
            const trapResult = parseIntegrationInput(input);
            if (trapResult.success) {
              try {
                const { steps, result: integralResult } = trapezoidalRule(
                  trapResult.a,
                  trapResult.b,
                  trapResult.equation,
                  trapResult.n
                );
                
                result = {
                  success: true,
                  steps: steps,
                  result: integralResult,
                  method: 'trapezoidal'
                };
              } catch (error) {
                result = { success: false, error: error.message };
              }
            } else {
              result = { success: false, error: trapResult.error };
            }
            break;
  
          case '7': // Simpson's Rule
            const simpsonResult = parseIntegrationInput(input);
            if (simpsonResult.success) {
              try {
                const { steps, result: integralResult } = simpsonsRule(
                  simpsonResult.a,
                  simpsonResult.b,
                  simpsonResult.equation,
                  simpsonResult.n
                );
                
                result = {
                  success: true,
                  steps: steps,
                  result: integralResult,
                  method: 'simpson'
                };
              } catch (error) {
                result = { success: false, error: error.message };
              }
            } else {
              result = { success: false, error: simpsonResult.error };
            }
            break;
  

            case '8': // Jacobi Eigenvalue
  const eigenResult = parseMatrixInput(input);
  if (eigenResult.success) {
    try {
      const { steps, eigenvalues, eigenVectors } = jacobiEigenvalue(eigenResult.matrix);
      
      result = {
        success: true,
        steps: steps,
        eigenvalues: eigenvalues,
        eigenVectors: eigenVectors,
        method: 'jacobi-eigen'
      };
    } catch (error) {
      result = { success: false, error: error.message };
    }
  } else {
    result = { success: false, error: eigenResult.error };
  }
  break;

  // In your method selection dropdown or options, add:
  // <option value="spline">Cubic Spline Interpolation</option>
  
  // In your solve handler, add this case:
  case '9':
      const splineData = parseSplineInput(input);
      if (!splineData.success) {
          // Handle error
          return;
      }
      const splineResult = cubicSpline(splineData.points);
      // Display splineResult.steps
      break;
          default:
            result = { success: false, error: 'Unknown method' };
        }
  
        // Display results
        if (result.success) {
          if (result.steps) {
            // Display steps with delay
            await displayStepsWithDelay(result);
          } else if (result.content) {
            // For basic math
            addBotMessage(result.content, false, 1000);
          }
        } else {
          addBotMessage(
            <div className="error-container">
              <strong>❌ Error:</strong>
              <div className="error-message">{result.error}</div>
            </div>,
            false,
            1000
          );
        }
  
        // Show continue options
        const continueOptions = (
          <div className="math-options">
            <strong>Would you like to try another method?</strong>
            <div className="options-container">
              <button className="option-button" onClick={restart}>
                Yes, show menu
              </button>
              <button className="option-button" onClick={sameMethod}>
                Use same method again
              </button>
            </div>
          </div>
        );
  
        const totalDelay = result.steps ? result.steps.length * 2500 + 2000 : 2000;
        addBotMessage(continueOptions, true, totalDelay);
        setCurrentState('completed');
  
      } catch (error) {
        addBotMessage(
          <div className="error-container">
            <strong>❌ Error:</strong>
            <div className="error-message">{error.message}</div>
          </div>,
          false,
          1000
        );
      }
    }, 1500);
  };
  
  
 
  // Replace only the displayStepsWithDelay function
  const displayStepsWithDelay = async (result) => {
    let currentDelay = 1500;
  
    if (result.method === 'gaussian' || result.method === 'jordan') {
      // Display matrix elimination steps
      addBotMessage(
        <div className="result-container">
          <h3>Step-by-Step Solution:</h3>
        </div>,
        false,
        currentDelay
      );
      currentDelay += 1000;
  
      for (let i = 0; i < result.steps.length; i++) {
        const step = result.steps[i];
        const stepContent = (
          <div className="step-container">
            <h4>Step {i}: {step.description}</h4>
            {step.operation && (
              <div className="operation-text">
                <strong>Operation:</strong> <span dangerouslySetInnerHTML={{ __html: step.operation }} />
              </div>
            )}
            <div className="matrix-display">
              <div dangerouslySetInnerHTML={{ __html: matrixToLatex(step.matrix) }} />
            </div>
          </div>
        );
        
        addBotMessage(stepContent, false, currentDelay);
        currentDelay += 2500;
      }
  
      // Display solutions
      const varNames = ['x', 'y', 'z', 'w', 'u', 'v'];
      const solutionsLatex = `$$\\begin{aligned} ${result.solutions.map((value, index) => {
        const varName = varNames[index] || `x_{${index + 1}}`;
        return `${varName} &= ${value.toFixed(6)}`;
      }).join(' \\\\\\ ')} \\end{aligned}$$`;
  
      const solutionContent = (
        <div className="solution-container">
          <h3>✓ Solutions:</h3>
          <div dangerouslySetInnerHTML={{ __html: solutionsLatex }} />
        </div>
      );
      
      addBotMessage(solutionContent, false, currentDelay);
  
    } else if (result.method === 'jacobi' || result.method === 'seidel') {
      // Display iterative method steps
      addBotMessage(
        <div className="result-container">
          <h3>Iterative Solution:</h3>
        </div>,
        false,
        currentDelay
      );
      currentDelay += 1000;
  
      const varNames = ['x', 'y', 'z', 'w', 'u', 'v'];
  
      for (let i = 0; i < result.steps.length; i++) {
        const step = result.steps[i];
        const iterationLatex = `$$\\begin{aligned} ${step.values.map((val, idx) => {
          const varName = varNames[idx] || `x_{${idx + 1}}`;
          return `${varName}^{(${step.iteration})} &= ${val.toFixed(6)}`;
        }).join(' \\\\\\ ')} \\end{aligned}$$`;
  
        const stepContent = (
          <div className="step-container">
            <h4>{step.description}</h4>
            <div className="iteration-values">
              <div dangerouslySetInnerHTML={{ __html: iterationLatex }} />
            </div>
          </div>
        );
        
        addBotMessage(stepContent, false, currentDelay);
        currentDelay += 2000;
      }
  
      // Display final solutions
      const solutionsLatex = `$$\\begin{aligned} ${result.solutions.map((value, index) => {
        const varName = varNames[index] || `x_{${index + 1}}`;
        return `${varName} &= ${value.toFixed(6)}`;
      }).join(' \\\\\\ ')} \\end{aligned}$$`;
  
      const solutionContent = (
        <div className="solution-container">
          <h3>✓ Final Solutions:</h3>
          <div dangerouslySetInnerHTML={{ __html: solutionsLatex }} />
        </div>
      );
      
      addBotMessage(solutionContent, false, currentDelay);
  
    } else if (result.method === 'trapezoidal' || result.method === 'simpson') {
      // Display integration steps
      addBotMessage(
        <div className="result-container">
          <h3>Integration Solution:</h3>
        </div>,
        false,
        currentDelay
      );
      currentDelay += 1000;
  
      for (let i = 0; i < result.steps.length; i++) {
        const step = result.steps[i];
        const stepContent = (
          <div className="step-container">
            <h4>{step.description}</h4>
            <div 
              className="step-content" 
              dangerouslySetInnerHTML={{ __html: step.content }}
            />
            {step.detail && <p className="step-detail">{step.detail}</p>}
          </div>
        );
        
        addBotMessage(stepContent, false, currentDelay);
        currentDelay += 2500;
      }
    }
// Add this case in displayStepsWithDelay function, after the 'simpson' case

if (result.method === 'jacobi-eigen') {
  for (let i = 0; i < result.steps.length; i++) {
    const step = result.steps[i];
    
    let matrixHTML = '<div class="matrix-container">';
    matrixHTML += '<h4>Matrix A (Iteration ' + step.iteration + '):</h4>';
    matrixHTML += '<table class="matrix-table">';
    
    for (let row of step.matrix) {
      matrixHTML += '<tr>';
      for (let val of row) {
        matrixHTML += `<td>${val.toFixed(6)}</td>`;
      }
      matrixHTML += '</tr>';
    }
    matrixHTML += '</table>';
    
    if (step.converged) {
      matrixHTML += '<div class="eigenvalue-results">';
      matrixHTML += '<h4>Eigenvalues:</h4>';
      matrixHTML += '<div class="eigenvalues">';
      step.eigenvalues.forEach((val, idx) => {
        matrixHTML += `<div>λ${idx + 1} = ${val.toFixed(6)}</div>`;
      });
      matrixHTML += '</div>';
      
      
      // Continue from where it was cut off in the displayStepsWithDelay function
      
            matrixHTML += '<h4>Eigenvectors:</h4>';
            matrixHTML += '<table class="matrix-table">';
            for (let row of step.eigenVectors) {
              matrixHTML += '<tr>';
              for (let val of row) {
                matrixHTML += `<td>${val.toFixed(6)}</td>`;
              }
              matrixHTML += '</tr>';
            }
            matrixHTML += '</table>';
            matrixHTML += '</div>';
          } else {
            matrixHTML += `<p class="step-detail">Max off-diagonal: ${step.maxOffDiagonal?.toFixed(6)}</p>`;
            matrixHTML += `<p class="step-detail">Rotation angle: ${step.rotationAngle?.toFixed(6)} radians</p>`;
          }
          
          matrixHTML += '</div>';
          
          const stepContent = (
            <div className="step-container">
              <h4>{step.description}</h4>
              <div dangerouslySetInnerHTML={{ __html: matrixHTML }} />
            </div>
          );
          
          addBotMessage(stepContent, false, currentDelay);
          currentDelay += 2500;
          
          if (step.converged) break;
        }
      }
      

  };
  
  // Add the matrixToLatex helper function (place it before displayStepsWithDelay)
  const matrixToLatex = (matrix) => {
    let latex = '$$\\begin{bmatrix}\n';
    for (let i = 0; i < matrix.length; i++) {
      latex += matrix[i].map(val => {
        const rounded = Math.abs(val) < 1e-10 ? 0 : Math.round(val * 10000) / 10000;
        return rounded;
      }).join(' & ');
      if (i < matrix.length - 1) {
        latex += ' \\\\\\\n';
      }
    }
    latex += '\n\\end{bmatrix}$$';
    return latex;
  };
  
  
  const restart = () => {
    addUserMessage('Show menu');
    setInputDisabled(true);
    setSelectedMethod(null);
    showMainMenu();
  };

  const sameMethod = () => {
    addUserMessage('Use same method');
    setInputDisabled(true);
    addBotMessage(mathMethods[selectedMethod].inputPrompt, false, 800);
    setTimeout(() => {
      setCurrentState('awaiting_input');
      setInputDisabled(false);
    }, 800);
  };

  const handleSend = () => {
    if (!inputValue.trim() || inputDisabled) return;

    if (currentState === 'awaiting_choice') {
      const methodKey = inputValue.trim();
      if (mathMethods[methodKey]) {
        selectMethod(methodKey);
      } else {
        addUserMessage(inputValue);
        addBotMessage('Invalid choice. Please select a number from 1 to 7.', false, 500);
      }
    } else if (currentState === 'awaiting_input') {
      processInput(inputValue);
    }

    setInputValue('');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="math-chat-container">
      <div className="chat-header">
    
      <div className="chat-header-info">
        <h3>Chat with Math</h3>
        <p>Online</p>
      </div>
     
    </div>
      <div className="math-chat-messages">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`math-message ${message.isUser ? 'user' : 'bot'}`}
          >
            <div className="math-message-content">
              {typeof message.content === 'string' ? (
                <div dangerouslySetInnerHTML={{ __html: message.content }} />
              ) : (
                message.content
              )}
            </div>
            <div className="math-message-time">
              {message.timestamp.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="math-chat-input-container">
        <input
          type="text"
          className="math-chat-input"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={inputDisabled ? 'Please wait...' : 'Type your message...'}
          disabled={inputDisabled}
        />
        <button
          className="math-send-button"
          onClick={handleSend}
          disabled={inputDisabled || !inputValue.trim()}
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default MathChat;
