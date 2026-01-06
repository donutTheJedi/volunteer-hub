'use client';

import { useState, useEffect } from 'react';
import { useLocale } from 'next-intl';
import { BlockMath } from 'react-katex';
import 'katex/dist/katex.min.css';

type Question = {
  id: number;
  question: string;
  answer: string | number;
  letter: string;
  isMath?: boolean;
};

type Part = {
  word: string;
  questions: Question[];
};

export default function GamePage() {
  const locale = useLocale();
  const [currentPart, setCurrentPart] = useState(0);

  // Define the 5 parts, each spelling a word from "El Codigo Al Candado Es"
  const parts: Part[] = [
    {
      word: "EL",
      questions: [
        {
          id: 1,
          question: "3 + 2 = ?",
          answer: 5,
          letter: "E",
          isMath: true
        },
        {
          id: 2,
          question: "8 + 4 = ?",
          answer: 12,
          letter: "L",
          isMath: true
        }
      ]
    },
    {
      word: "CODIGO",
      questions: [
        {
          id: 1,
          question: "¿Qué país es el segundo más grande por área terrestre?",
          answer: "Canadá",
          letter: "C"
        },
        {
          id: 2,
          question: "¿Qué país está ubicado en la Península Arábiga?",
          answer: "Omán",
          letter: "O"
        },
        {
          id: 3,
          question: "¿Qué país escandinavo es conocido por LEGO?",
          answer: "Dinamarca",
          letter: "D"
        },
        {
          id: 4,
          question: "¿Qué país europeo tiene forma de bota?",
          answer: "Italia",
          letter: "I"
        },
        {
          id: 5,
          question: "¿Qué país europeo es conocido por sus antiguas ruinas y la Acrópolis?",
          answer: "Grecia",
          letter: "G"
        },
        {
          id: 6,
          question: "¿Qué país es conocido por sus antiguas ruinas y rica historia?",
          answer: "Omán",
          letter: "O"
        }
      ]
    },
    {
      word: "AL",
      questions: [
        {
          id: 1,
          question: "1 + 0 = ?",
          answer: 1,
          letter: "A",
          isMath: true
        },
        {
          id: 2,
          question: "10 + 2 = ?",
          answer: 12,
          letter: "L",
          isMath: true
        }
      ]
    },
    {
      word: "CANDADO",
      questions: [
        {
          id: 1,
          question: "¿Qué país es conocido por el jarabe de arce y el hockey?",
          answer: "Canadá",
          letter: "C"
        },
        {
          id: 2,
          question: "¿Qué país es conocido por el tango y la carne?",
          answer: "Argentina",
          letter: "A"
        },
        {
          id: 3,
          question: "¿Qué país es conocido por los fiordos y las auroras boreales?",
          answer: "Noruega",
          letter: "N"
        },
        {
          id: 4,
          question: "¿Qué país es conocido por sus fiordos y las auroras boreales?",
          answer: "Dinamarca",
          letter: "D"
        },
        {
          id: 5,
          question: "¿Qué país sudamericano es famoso por su producción de vino?",
          answer: "Argentina",
          letter: "A"
        },
        {
          id: 6,
          question: "¿Qué otro país ha vivido Baron?",
          answer: "Dinamarca",
          letter: "D"
        },
        {
          id: 7,
          question: "¿Qué país es conocido por sus antiguas ruinas y rica historia?",
          answer: "Omán",
          letter: "O"
        }
      ]
    },
    {
      word: "ES",
      questions: [
        {
          id: 1,
          question: "4 + 1 = ?",
          answer: 5,
          letter: "E",
          isMath: true
        },
        {
          id: 2,
          question: "15 + 4 = ?",
          answer: 19,
          letter: "S",
          isMath: true
        }
      ]
    }
  ];

  // Initialize state for all parts
  const [answers, setAnswers] = useState<string[][]>(
    parts.map(part => new Array(part.questions.length).fill(''))
  );
  const [checked, setChecked] = useState<boolean[][]>(
    parts.map(part => new Array(part.questions.length).fill(false))
  );
  const [correct, setCorrect] = useState<boolean[][]>(
    parts.map(part => new Array(part.questions.length).fill(false))
  );

  const checkAnswer = (partIndex: number, questionIndex: number) => {
    const question = parts[partIndex].questions[questionIndex];
    const userAnswer = answers[partIndex][questionIndex].trim();
    const correctAnswer = question.answer;
    
    if (!userAnswer) {
      return; // Don't check if answer is empty
    }
    
    let isCorrect = false;
    if (question.isMath) {
      // For math questions, compare numbers
      const userNum = parseInt(userAnswer);
      const correctNum = typeof correctAnswer === 'number' ? correctAnswer : parseInt(String(correctAnswer));
      isCorrect = !isNaN(userNum) && userNum === correctNum;
    } else {
      // For country questions, compare strings (case-insensitive, normalize accents)
      const normalize = (str: string) => str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      isCorrect = normalize(userAnswer) === normalize(String(correctAnswer));
    }
    
    const newChecked = [...checked];
    newChecked[partIndex] = [...newChecked[partIndex]];
    newChecked[partIndex][questionIndex] = true;
    setChecked(newChecked);
    
    const newCorrect = [...correct];
    newCorrect[partIndex] = [...newCorrect[partIndex]];
    newCorrect[partIndex][questionIndex] = isCorrect;
    setCorrect(newCorrect);
  };

  const handleAnswerChange = (partIndex: number, questionIndex: number, value: string) => {
    const newAnswers = [...answers];
    newAnswers[partIndex] = [...newAnswers[partIndex]];
    newAnswers[partIndex][questionIndex] = value;
    setAnswers(newAnswers);
    
    // Reset checked status when answer changes
    const newChecked = [...checked];
    newChecked[partIndex] = [...newChecked[partIndex]];
    newChecked[partIndex][questionIndex] = false;
    setChecked(newChecked);
  };

  const isPartComplete = (partIndex: number): boolean => {
    return parts[partIndex].questions.every((q, qIndex) => {
      const userAnswer = answers[partIndex][qIndex].trim();
      const correctAnswer = q.answer;
      
      if (q.isMath) {
        const userNum = parseInt(userAnswer);
        const correctNum = typeof correctAnswer === 'number' ? correctAnswer : parseInt(String(correctAnswer));
        return !isNaN(userNum) && userNum === correctNum;
      } else {
        const normalize = (str: string) => str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        return normalize(userAnswer) === normalize(String(correctAnswer));
      }
    });
  };

  const canGoToNext = (): boolean => {
    return isPartComplete(currentPart);
  };

  const goToNext = () => {
    if (currentPart < parts.length - 1 && canGoToNext()) {
      setCurrentPart(currentPart + 1);
    }
  };

  const goToPrevious = () => {
    if (currentPart > 0) {
      setCurrentPart(currentPart - 1);
    }
  };

  const resetPart = (partIndex: number) => {
    const newAnswers = [...answers];
    newAnswers[partIndex] = new Array(parts[partIndex].questions.length).fill('');
    setAnswers(newAnswers);
    
    const newChecked = [...checked];
    newChecked[partIndex] = new Array(parts[partIndex].questions.length).fill(false);
    setChecked(newChecked);
    
    const newCorrect = [...correct];
    newCorrect[partIndex] = new Array(parts[partIndex].questions.length).fill(false);
    setCorrect(newCorrect);
  };

  const currentPartData = parts[currentPart];
  const allPartsComplete = parts.every((_, index) => isPartComplete(index));
  const [showSummary, setShowSummary] = useState(false);
  const [showPhraseInput, setShowPhraseInput] = useState(false);
  const [phraseAnswer, setPhraseAnswer] = useState('');
  const [phraseCorrect, setPhraseCorrect] = useState(false);
  const [calculusAnswer, setCalculusAnswer] = useState('');
  const [calculusChecked, setCalculusChecked] = useState(false);
  const [calculusCorrect, setCalculusCorrect] = useState(false);

  // Auto-show summary by default
  useEffect(() => {
    setShowSummary(true);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-voluna-light-blue to-voluna-medium-blue py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 mb-8">
          <h1 className="text-4xl font-bold text-center text-voluna-primary dark:text-voluna-secondary mb-2">
            🎮 Juego de Acertijos 🎮
          </h1>
          <p className="text-center text-gray-600 dark:text-gray-400 mb-8">
            ¡Resuelve cada parte para revelar el mensaje oculto! Verifica cada respuesta individualmente.
          </p>

          {/* Part Navigation */}
          <div className="mb-8 flex justify-center items-center gap-4">
            {parts.map((part, index) => (
              <div key={index} className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPart(index)}
                  className={`w-12 h-12 rounded-full font-bold transition-all ${
                    index === currentPart
                      ? 'bg-voluna-accent text-white scale-110'
                      : isPartComplete(index)
                      ? 'bg-green-500 text-white hover:bg-green-600'
                      : 'bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-400 dark:hover:bg-gray-500'
                  }`}
                >
                  {index + 1}
                </button>
                {index < parts.length - 1 && (
                  <div className={`w-8 h-1 ${
                    isPartComplete(index) ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                  }`} />
                )}
              </div>
            ))}
          </div>

          {/* Current Part Display */}
          <div className="mb-8">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-semibold text-voluna-secondary dark:text-voluna-light-blue">
                Parte {currentPart + 1} de {parts.length}
              </h2>
            </div>

            <div className="space-y-4">
              {currentPartData.questions.map((q, qIndex) => (
                <div key={q.id} className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {q.id}. {q.question}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type={q.isMath ? "number" : "text"}
                      value={answers[currentPart][qIndex]}
                      onChange={(e) => handleAnswerChange(currentPart, qIndex, e.target.value)}
                      className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                               bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                               focus:ring-2 focus:ring-voluna-accent focus:border-voluna-accent"
                      placeholder={q.isMath ? "Ingresa la respuesta..." : "Ingresa el nombre del país..."}
                    />
                    <button
                      onClick={() => checkAnswer(currentPart, qIndex)}
                      className="px-4 py-2 bg-voluna-accent hover:bg-voluna-accent-hover 
                               text-white font-medium rounded-md transition-colors"
                    >
                      Check
                    </button>
                  </div>
                  {checked[currentPart][qIndex] && (
                    <div className={`mt-2 text-sm font-medium ${
                      correct[currentPart][qIndex] 
                        ? 'text-green-600 dark:text-green-400' 
                        : 'text-red-600 dark:text-red-400'
                    }`}>
                      {correct[currentPart][qIndex] ? '✅ ¡Correcto!' : '❌ Incorrecto, ¡intenta de nuevo!'}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Part completion message */}
            {isPartComplete(currentPart) && (
              <div className="mt-6 p-4 bg-green-100 dark:bg-green-900 rounded-lg text-center">
                <p className="text-green-800 dark:text-green-200 font-semibold">
                  ✅ ¡Parte {currentPart + 1} completa! Puedes proceder a la siguiente parte.
                </p>
              </div>
            )}
          </div>

          {/* Navigation Buttons */}
          <div className="flex gap-4 justify-center items-center">
            <button
              onClick={goToPrevious}
              disabled={currentPart === 0}
              className="px-6 py-2 bg-gray-500 hover:bg-gray-600 disabled:bg-gray-300 disabled:cursor-not-allowed
                       text-white font-medium rounded-lg transition-colors"
            >
              ← Anterior
            </button>
            <button
              onClick={() => resetPart(currentPart)}
              className="px-6 py-2 bg-gray-500 hover:bg-gray-600 
                       text-white font-medium rounded-lg transition-colors"
            >
              Reiniciar Parte
            </button>
            <button
              onClick={goToNext}
              disabled={!canGoToNext() || currentPart === parts.length - 1}
              className="px-6 py-2 bg-voluna-accent hover:bg-voluna-accent-hover disabled:bg-gray-300 disabled:cursor-not-allowed
                       text-white font-medium rounded-lg transition-colors"
            >
              Siguiente →
            </button>
          </div>

          {/* Final Message */}
          {allPartsComplete && (
            <div className="mt-8">
              <div className="p-6 bg-gradient-to-r from-voluna-golden-yellow to-voluna-accent 
                            rounded-lg text-center animate-pulse mb-6">
                <p className="text-2xl font-bold text-white mb-2">
                  🎉 ¡Felicidades! 🎉
                </p>
                <p className="text-lg text-white mb-4">
                  ¡Has resuelto todas las partes!
                </p>
                <p className="text-2xl font-bold text-white">
                  {parts.map(part => part.word).join(' ')}
                </p>
              </div>

              {/* Phrase Entry Section */}
              {!phraseCorrect && (
                <div className="mt-6 p-6 bg-white dark:bg-gray-800 rounded-lg border-2 border-voluna-accent shadow-lg">
                  {!showPhraseInput ? (
                    <div className="text-center">
                      <p className="text-lg font-semibold text-voluna-primary dark:text-voluna-secondary mb-4">
                        Ingresa la frase que descubriste para continuar
                      </p>
                      <button
                        onClick={() => setShowPhraseInput(true)}
                        className="px-8 py-3 bg-voluna-accent hover:bg-voluna-accent-hover 
                                 text-white font-semibold rounded-lg shadow-lg 
                                 transition-all duration-200 transform hover:scale-105"
                      >
                        Ingresar Frase
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <label className="block text-lg font-semibold text-voluna-primary dark:text-voluna-secondary text-center">
                        Ingresa la frase completa:
                      </label>
                      <input
                        type="text"
                        value={phraseAnswer}
                        onChange={(e) => setPhraseAnswer(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            const correctPhrase = parts.map(part => part.word).join(' ');
                            if (phraseAnswer.trim().toLowerCase() === correctPhrase.toLowerCase()) {
                              setPhraseCorrect(true);
                            }
                          }
                        }}
                        className="w-full px-4 py-3 border-2 border-voluna-accent rounded-lg 
                                 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                                 text-center text-lg font-medium
                                 focus:ring-2 focus:ring-voluna-accent focus:border-voluna-accent"
                        placeholder="Escribe la frase aquí..."
                        autoFocus
                      />
                      <div className="flex gap-4 justify-center">
                        <button
                          onClick={() => {
                            const correctPhrase = parts.map(part => part.word).join(' ');
                            if (phraseAnswer.trim().toLowerCase() === correctPhrase.toLowerCase()) {
                              setPhraseCorrect(true);
                            }
                          }}
                          className="px-8 py-3 bg-voluna-accent hover:bg-voluna-accent-hover 
                                   text-white font-semibold rounded-lg shadow-lg 
                                   transition-all duration-200 transform hover:scale-105"
                        >
                          Enviar
                        </button>
                        <button
                          onClick={() => {
                            setShowPhraseInput(false);
                            setPhraseAnswer('');
                          }}
                          className="px-8 py-3 bg-gray-500 hover:bg-gray-600 
                                   text-white font-semibold rounded-lg shadow-lg 
                                   transition-all duration-200"
                        >
                          Cancelar
                        </button>
                      </div>
                      {phraseAnswer && phraseAnswer.trim().toLowerCase() !== parts.map(part => part.word).join(' ').toLowerCase() && (
                        <p className="text-center text-red-600 dark:text-red-400 text-sm">
                          ❌ Frase incorrecta. ¡Intenta de nuevo!
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Success Message for Phrase */}
              {phraseCorrect && (
                <div className="mt-6 p-6 bg-gradient-to-r from-green-500 to-green-600 
                              rounded-lg text-center animate-pulse">
                  <p className="text-2xl font-bold text-white mb-2">
                    🎊 ¡Perfecto! 🎊
                  </p>
                  <p className="text-lg text-white">
                    ¡Has ingresado la frase correcta!
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Calculus Problem Section */}
          {phraseCorrect && (
            <div className="mt-8">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-8 border-4 border-voluna-accent shadow-2xl">
                <h2 className="text-3xl font-bold text-center text-voluna-primary dark:text-voluna-secondary mb-4">
                  📐 Desafío Final: Problema de Cálculo
                </h2>
                
                <div className="bg-yellow-50 dark:bg-yellow-900 border-2 border-yellow-400 rounded-lg p-4 mb-6">
                  <p className="text-lg font-bold text-center text-yellow-800 dark:text-yellow-200">
                    ⚠️ IMPORTANTE: La respuesta a este problema de cálculo es la respuesta final al candado.
                  </p>
                  <p className="text-center text-yellow-700 dark:text-yellow-300 mt-2">
                    El número que obtengas aquí es el código que necesitas.
                  </p>
                </div>
                
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 mb-6">
                  <p className="text-lg text-gray-800 dark:text-gray-200 mb-4">
                    El agua se está filtrando de un tanque. La tasa de cambio de la tasa de fuga está dada por:
                  </p>
                  <div className="text-center bg-white dark:bg-gray-800 p-4 rounded border-2 border-voluna-accent mb-4">
                    <BlockMath math="\frac{d^2W}{dt^2} = 3t + 3.14" />
                  </div>
                  <p className="text-lg text-gray-800 dark:text-gray-200 mb-2">
                    donde <strong>W</strong> es la cantidad total de agua filtrada (en litros) y <strong>t</strong> es el tiempo en horas.
                  </p>
                  <p className="text-lg text-gray-800 dark:text-gray-200">
                    Inicialmente, la tasa de fuga es <strong>dW/dt = 1 litro por hora</strong> cuando <strong>t = 0</strong>, y aún no se ha filtrado agua, por lo que <strong>W(0) = 0 litros</strong>.
                  </p>
                </div>

                <div className="space-y-6">
                  {/* Part (c) */}
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <label className="block text-lg font-semibold text-voluna-secondary dark:text-voluna-light-blue mb-3">
                      (c) ¿Cuánta agua se ha filtrado después de t = 10 horas?
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={calculusAnswer}
                        onChange={(e) => {
                          setCalculusAnswer(e.target.value);
                          setCalculusChecked(false);
                        }}
                        className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                                 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                                 focus:ring-2 focus:ring-voluna-accent focus:border-voluna-accent"
                        placeholder="Ingresa tu respuesta (en litros) - Este es el código del candado"
                      />
                      <button
                        onClick={() => {
                          const userAnswer = calculusAnswer.trim().toLowerCase();
                          // Accept 667 or 667.0 or 667 liters, etc. - extract number
                          const numMatch = userAnswer.match(/667(?:\.0+)?/);
                          const isCorrect = numMatch !== null;
                          setCalculusChecked(true);
                          setCalculusCorrect(isCorrect);
                        }}
                        className="px-4 py-2 bg-voluna-accent hover:bg-voluna-accent-hover 
                                 text-white font-medium rounded-md transition-colors"
                      >
                        Verificar
                      </button>
                    </div>
                    {calculusChecked && (
                      <div className={`mt-2 text-sm font-medium ${
                        calculusCorrect 
                          ? 'text-green-600 dark:text-green-400' 
                          : 'text-red-600 dark:text-red-400'
                      }`}>
                        {calculusCorrect ? '✅ ¡Correcto! Este es el código del candado: 667' : '❌ Incorrecto, ¡intenta de nuevo!'}
                      </div>
                    )}
                  </div>
                </div>

                {/* Completion message */}
                {calculusCorrect && (
                  <div className="mt-6 p-6 bg-gradient-to-r from-voluna-golden-yellow to-voluna-accent 
                                rounded-lg text-center animate-pulse">
                    <p className="text-2xl font-bold text-white mb-2">
                      🏆 ¡Felicidades! 🏆
                    </p>
                    <p className="text-lg text-white mb-2">
                      ¡Has completado todo el desafío!
                    </p>
                    <p className="text-xl font-bold text-white">
                      El código del candado es: 667
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Summary Sheet - Always visible, shows current progress */}
          <div className="mt-8">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border-4 border-voluna-accent shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-3xl font-bold text-voluna-primary dark:text-voluna-secondary">
                  📋 Resumen de Respuestas
                </h3>
                <button
                  onClick={() => setShowSummary(!showSummary)}
                  className="px-4 py-2 bg-gray-500 hover:bg-gray-600 
                           text-white font-medium rounded-lg transition-colors text-sm"
                >
                  {showSummary ? 'Ocultar' : 'Mostrar'}
                </button>
              </div>
              {showSummary && (
                <div className="space-y-6">
                  {parts.map((part, partIndex) => {
                    const partComplete = isPartComplete(partIndex);
                    const answeredCount = answers[partIndex].filter(a => a.trim() !== '').length;
                    const totalQuestions = part.questions.length;
                    
                    return (
                      <div key={partIndex} className={`rounded-lg p-4 border-2 ${
                        partComplete 
                          ? 'bg-green-50 dark:bg-green-900 border-green-500' 
                          : 'bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600'
                      }`}>
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-lg font-semibold text-voluna-secondary dark:text-voluna-light-blue">
                            Parte {partIndex + 1}
                            {partComplete && <span className="ml-2 text-green-600 dark:text-green-400">✅</span>}
                          </h4>
                          <span className={`text-sm font-medium ${
                            partComplete 
                              ? 'text-green-600 dark:text-green-400' 
                              : 'text-gray-600 dark:text-gray-400'
                          }`}>
                            {answeredCount}/{totalQuestions} respondidas
                            {partComplete && ' • Completa'}
                          </span>
                        </div>
                        <div className="space-y-2">
                          {part.questions.map((q, qIndex) => {
                            const hasAnswer = answers[partIndex][qIndex].trim() !== '';
                            let isCorrect = false;
                            
                            if (hasAnswer) {
                              if (q.isMath) {
                                const userNum = parseInt(answers[partIndex][qIndex].trim());
                                const correctNum = typeof q.answer === 'number' ? q.answer : parseInt(String(q.answer));
                                isCorrect = !isNaN(userNum) && userNum === correctNum;
                              } else {
                                const normalize = (str: string) => str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                                isCorrect = normalize(answers[partIndex][qIndex].trim()) === normalize(String(q.answer));
                              }
                            }
                            
                            return (
                              <div key={q.id} className="flex items-start gap-3 text-sm">
                                <span className="font-medium text-gray-600 dark:text-gray-400 min-w-[2rem]">
                                  {q.id}.
                                </span>
                                <div className="flex-1">
                                  <p className="text-gray-700 dark:text-gray-300 mb-1">
                                    {q.question}
                                  </p>
                                  <p className={`font-semibold ${
                                    isCorrect
                                      ? 'text-green-600 dark:text-green-400'
                                      : hasAnswer
                                      ? 'text-gray-900 dark:text-gray-100'
                                      : 'text-gray-500 dark:text-gray-400 italic'
                                  }`}>
                                    {hasAnswer ? `Respuesta: ${answers[partIndex][qIndex]}` : '(aún no respondida)'}
                                    {isCorrect && <span className="ml-2">✅</span>}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
