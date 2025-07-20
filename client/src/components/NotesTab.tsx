import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Code, Type, Hash, List, Quote, Minus } from 'lucide-react';
import Editor from 'react-simple-code-editor';
import { highlight, languages } from 'prismjs';
import 'prismjs/components/prism-python';
import 'prismjs/themes/prism-tomorrow.css';
import { Problem } from './ProblemList';
import '../notionEditor.css';

interface NotesTabProps {
  problem: Problem;
  onNotesSaved?: (problemId: number, notes: string) => void;
}

const blockTypes = [
  { type: 'text', icon: Type, label: 'Text'},
  { type: 'code', icon: Code, label: 'Code', placeholder: 'Write your code here...' },
  { type: 'heading', icon: Hash, label: 'Heading', placeholder: 'Heading' },
  { type: 'bullet', icon: List, label: 'Bullet List', placeholder: 'List item' },
  { type: 'quote', icon: Quote, label: 'Quote', placeholder: 'Quote' },
  { type: 'divider', icon: Minus, label: 'Divider', placeholder: '' }
];

type Block = {
  id: number;
  type: string;
  content: string;
  placeholder?: string;
};

const NotesTab: React.FC<NotesTabProps> = ({ problem, onNotesSaved }) => {
  const [blocks, setBlocks] = useState<Block[]>([
    { id: 1, type: 'text', content: '', placeholder: 'Type "/" for commands' }
  ]);
  const [showMenu, setShowMenu] = useState<{ show: boolean; blockId: number | null; x?: number; y?: number }>({ show: false, blockId: null });
  const [activeBlock, setActiveBlock] = useState(1);
  const [status, setStatus] = useState('');
  const textareaRefs = useRef<{ [key: number]: HTMLTextAreaElement | null }>({});
  const codeBlockRefs = useRef<{ [key: number]: any }>({});
  const menuRef = useRef<HTMLDivElement | null>(null);
  const menuPositionRef = useRef<'top' | 'bottom'>('bottom');

  // Load notes from problem object when problem changes
  useEffect(() => {
    if (problem.notes) {
      try {
        const parsed = JSON.parse(problem.notes);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].id && parsed[0].type) {
          setBlocks(parsed);
          setActiveBlock(parsed[0].id);
          return;
        }
      } catch {}
    }
    setBlocks([{ id: 1, type: 'text', content: '', placeholder: 'Type "/" for commands' }]);
    setActiveBlock(1);
  }, [problem.id, problem.notes]);

  // Save notes to backend
  const saveNotes = useCallback(async (blocksToSave: Block[]) => {
    setStatus('Saving...');
    try {
      const content = JSON.stringify(blocksToSave);
      const response = await fetch(`http://localhost:3001/api/problems/${problem.id}/progress`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          solved: problem.solved || false,
          notes: content,
          solution: problem.solution || ''
        })
      });
      if (response.ok) {
        setStatus('Saved!');
        setTimeout(() => setStatus(''), 1200);
        problem.notes = content;
        onNotesSaved?.(problem.id, content);
      } else {
        setStatus('Failed to save');
        setTimeout(() => setStatus(''), 3000);
      }
    } catch (error) {
      setStatus('Failed to save');
      setTimeout(() => setStatus(''), 3000);
    }
  }, [problem, onNotesSaved]);

  // Save on blocks change
  useEffect(() => {
    if (blocks && blocks.length > 0) {
      saveNotes(blocks);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blocks]);

  const addNewBlock = (afterBlockId: number, type = 'text') => {
    const newBlockId = Math.max(...blocks.map(b => b.id)) + 1;
    const newBlock: Block = {
      id: newBlockId,
      type: type,
      content: '',
      placeholder: blockTypes.find(t => t.type === type)?.placeholder || ''
    };
    const currentIndex = blocks.findIndex(b => b.id === afterBlockId);
    const newBlocks = [...blocks];
    newBlocks.splice(currentIndex + 1, 0, newBlock);
    setBlocks(newBlocks);
    setActiveBlock(newBlockId);
    setTimeout(() => {
      const textarea = textareaRefs.current[newBlockId];
      if (textarea) textarea.focus();
    }, 0);
  };

  const handleInputChange = (blockId: number, value: string) => {
    if (value === '/') {
      const textarea = textareaRefs.current[blockId];
      if (textarea) {
        const rect = textarea.getBoundingClientRect();
        setShowMenu({ show: true, blockId, x: rect.left, y: rect.bottom + window.scrollY });
      }
      return;
    }
    if (value === '/code') {
      setTimeout(() => {
        changeBlockType(blockId, 'code');
      }, 100);
      return;
    }
    if (showMenu.show && showMenu.blockId === blockId && !value.startsWith('/')) {
      setShowMenu({ show: false, blockId: null });
    }
    setBlocks(blocks.map(block => block.id === blockId ? { ...block, content: value } : block));
  };

  const changeBlockType = (blockId: number, newType: string) => {
    const currentBlock = blocks.find(b => b.id === blockId);
    if (!currentBlock) return;
    const cleanContent = newType === 'divider' ? '' : currentBlock.content.replace(/^\/\w*/, '').trim();
    const updatedBlocks = blocks.map(block =>
      block.id === blockId ? {
        ...block,
        type: newType,
        content: cleanContent,
        placeholder: blockTypes.find(t => t.type === newType)?.placeholder || ''
      } : block
    );
    setBlocks(updatedBlocks);
    setShowMenu({ show: false, blockId: null });
    setTimeout(() => {
      if (newType !== 'divider') {
        const textarea = textareaRefs.current[blockId];
        if (textarea) {
          textarea.focus();
          textarea.setSelectionRange(cleanContent.length, cleanContent.length);
        }
      }
    }, 150);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>, blockId: number) => {
    if (e.key === 'Escape' && showMenu.show) {
      setShowMenu({ show: false, blockId: null });
      return;
    }
    if (e.key === '/') {
      menuPositionRef.current = 'bottom';
      setShowMenu({ show: true, blockId });
      setTimeout(() => {
        const textarea = textareaRefs.current[blockId];
        if (textarea) {
          const pos = textarea.selectionStart || 0;
          textarea.focus();
          textarea.setSelectionRange(pos, pos);
        }
      }, 0);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      addNewBlock(blockId);
    } else if (e.key === 'Backspace') {
      const textarea = e.target as HTMLTextAreaElement;
      
      // Case 1: Block is empty, convert to text block or move to previous block
      if (textarea.value === '') {
        const currentBlock = blocks.find(b => b.id === blockId);
        
        if (currentBlock && currentBlock.type !== 'text') {
          // Convert empty non-text block to text block
          e.preventDefault();
          changeBlockType(blockId, 'text');
          return;
        } else if (currentBlock && currentBlock.type === 'text') {
          // Move to end of previous block for empty text blocks
          const currentIndex = blocks.findIndex(b => b.id === blockId);
          const prevBlock = blocks[currentIndex - 1];
          
          if (prevBlock && prevBlock.type !== 'divider') {
            e.preventDefault();
            setActiveBlock(prevBlock.id);
            setTimeout(() => {
              if (prevBlock.type === 'code') {
                // Focus code block and move cursor to end
                const textarea = document.getElementById(`editor-${prevBlock.id}`) as HTMLTextAreaElement;
                if (textarea) {
                  textarea.focus();
                  textarea.setSelectionRange(prevBlock.content.length, prevBlock.content.length);
                }
              } else {
                // Focus regular textarea
                const prevTextarea = textareaRefs.current[prevBlock.id];
                if (prevTextarea) {
                  prevTextarea.focus();
                  prevTextarea.setSelectionRange(prevBlock.content.length, prevBlock.content.length);
                }
              }
            }, 0);
            return;
          } else if (prevBlock && prevBlock.type === 'divider') {
            // Delete the previous divider block
            e.preventDefault();
            setBlocks(prevBlocks => prevBlocks.filter(b => b.id !== prevBlock.id));
            setTimeout(() => {
              const textarea = textareaRefs.current[blockId];
              if (textarea) textarea.focus();
            }, 0);
            return;
          } else if (blocks.length > 1) {
            // Delete empty text block if no previous block
            e.preventDefault();
            setBlocks(prevBlocks => prevBlocks.filter(block => block.id !== blockId));
            const nextBlock = blocks[currentIndex + 1] || blocks[currentIndex - 1];
            if (nextBlock) {
              setActiveBlock(nextBlock.id);
              setTimeout(() => {
                const textarea = textareaRefs.current[nextBlock.id];
                if (textarea) textarea.focus();
              }, 0);
            }
            return;
          }
        }
      }
    }
  };

  // Separate keydown handler for divider (div)
  const handleDividerKeyDown = (e: React.KeyboardEvent<HTMLDivElement>, blockId: number) => {
    if ((e.key === 'Backspace' || e.key === 'Delete') && blocks.length > 1) {
      setBlocks(prevBlocks => prevBlocks.filter(b => b.id !== blockId));
      const currentIndex = blocks.findIndex(b => b.id === blockId);
      const nextBlock = blocks[currentIndex + 1] || blocks[currentIndex - 1];
      if (nextBlock) {
        setActiveBlock(nextBlock.id);
        setTimeout(() => {
          const textarea = textareaRefs.current[nextBlock.id];
          if (textarea) textarea.focus();
        }, 0);
      }
    }
  };

  // Improved code block keydown handler to match notion-demo logic
  const handleCodeBlockKeyDown = (e: React.KeyboardEvent, block: Block) => {
    if (e.key === 'Backspace') {
      const textarea = e.target as HTMLTextAreaElement;
      // If caret is at start (or only one block), allow deletion
      if ((textarea.selectionStart === 0 || textarea.selectionStart == null) && blocks.length > 1) {
        // If content is empty, delete the block
        if (!block.content || block.content === '') {
          e.preventDefault();
          setBlocks(prevBlocks => prevBlocks.filter(b => b.id !== block.id));
          // Focus previous or next block
          const currentIndex = blocks.findIndex(b => b.id === block.id);
          const nextBlock = blocks[currentIndex + 1] || blocks[currentIndex - 1];
          if (nextBlock) {
            setActiveBlock(nextBlock.id);
            setTimeout(() => {
              const textarea = textareaRefs.current[nextBlock.id];
              if (textarea) textarea.focus();
            }, 0);
          }
        }
      }
    }
  };

  useEffect(() => {
    if (showMenu.show && menuRef.current) {
      const blockElement = textareaRefs.current[showMenu.blockId!]?.parentElement?.parentElement;
      if (!blockElement) return;
      const blockRect = blockElement.getBoundingClientRect();
      const menuRect = menuRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - blockRect.bottom;
      const spaceAbove = blockRect.top;
      if (spaceBelow < menuRect.height && spaceAbove > menuRect.height) {
        menuPositionRef.current = 'top';
      } else {
        menuPositionRef.current = 'bottom';
      }
      if (menuRef.current) menuRef.current.style.display = 'none';
      if (menuRef.current) void menuRef.current.offsetHeight;
      if (menuRef.current) menuRef.current.style.display = '';
    }
  }, [showMenu.show, showMenu.blockId]);

  const renderCodeBlock = (block: Block) => {
    return (
      <div key={block.id} className="relative group mb-2">
        <div className="flex items-start">
          <div className="flex-1 relative">
            <Editor
              value={block.content}
              onValueChange={(code: string) => handleInputChange(block.id, code)}
              highlight={(code: string) => {
                let highlighted = highlight(code, languages.python, 'python');
                const builtins = ['set', 'print', 'len', 'range', 'list', 'dict', 'tuple', 'str', 'int', 'float', 'bool'];
                builtins.forEach(func => {
                  const regex = new RegExp(`\\b${func}\\b(?=\\()`, 'g');
                  highlighted = highlighted.replace(regex, `<span class=\"token function\" style=\"color: #669900 !important;\">${func}</span>`);
                });
                return highlighted;
              }}
              padding={22}
              style={{
                fontFamily: '"Fira code", "Fira Mono", monospace',
                fontSize: 14,
                backgroundColor: 'rgb(247, 246, 243)',
                color: '#32302C',
                borderRadius: '0.375rem',
                minHeight: '1.5rem',
                height: 'auto',
                resize: 'none',
                outline: 'none',
                border: 'none',
                boxShadow: 'none'
              }}
              onFocus={() => setActiveBlock(block.id)}
              ref={(el) => { codeBlockRefs.current[block.id] = el; }}
              onKeyDown={e => {
                const value = (e.target as HTMLTextAreaElement).value;
                if (
                  e.key === 'Backspace' &&
                  (!value || value === '')
                ) {
                  e.preventDefault();
                  if (blocks.length === 1) {
                    // Replace with a new empty text block
                    const newId = Date.now();
                    setBlocks([{ id: newId, type: 'text', content: '', placeholder: 'Type "/" for commands' }]);
                    setActiveBlock(newId);
                  } else {
                    setBlocks(prevBlocks => prevBlocks.filter(b => b.id !== block.id));
                    // Focus previous or next block
                    const currentIndex = blocks.findIndex(b => b.id === block.id);
                    const nextBlock = blocks[currentIndex + 1] || blocks[currentIndex - 1];
                    if (nextBlock) {
                      setActiveBlock(nextBlock.id);
                      setTimeout(() => {
                        const textarea = textareaRefs.current[nextBlock.id];
                        if (textarea) textarea.focus();
                      }, 0);
                    }
                  }
                }
              }}
              placeholder={block.placeholder}
              textareaId={`editor-${block.id}`}
              preClassName="language-python"
            />
          </div>
        </div>
      </div>
    );
  };

  const renderBlock = (block: Block) => {
    const blockType = blockTypes.find(t => t.type === block.type);
    const Icon = blockType?.icon;
    if (block.type === 'code') {
      return renderCodeBlock(block);
    }
    if (block.type === 'divider') {
      return (
        <div
          key={block.id}
          className="flex items-center my-4 outline-none"
          tabIndex={0}
          onFocus={() => setActiveBlock(block.id)}
          onKeyDown={e => handleDividerKeyDown(e, block.id)}
        >
          <div className="flex-1 h-2 border-t-2 border-gray-800"></div>
        </div>
      );
    }
    const baseClasses = "w-full resize-none border-none outline-none bg-transparent";
    const typeClasses: { [key: string]: string } = {
      text: "text-gray-800 text-base leading-6",
      code: "font-mono text-sm bg-gray-900 rounded px-3 py-2 text-green-400 border border-gray-700 whitespace-pre-wrap",
      heading: "text-2xl font-bold text-gray-900 leading-8",
      bullet: "text-gray-800 text-base leading-6 pl-6",
      quote: "text-gray-700 text-base leading-6 border-l-4 border-gray-300 pl-4 italic"
    };
    return (
      <div key={block.id} className="relative group mb-2">
        <div className="flex items-start">
          {block.type === 'bullet' && (
            <span className="absolute left-2 top-1 w-1 h-1 bg-gray-400 rounded-full"></span>
          )}
          <div className="flex-1">
            <textarea
              ref={el => { textareaRefs.current[block.id] = el; }}
              value={block.content}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleInputChange(block.id, e.target.value)}
              onKeyDown={(e: React.KeyboardEvent<HTMLTextAreaElement>) => handleKeyDown(e, block.id)}
              onFocus={() => setActiveBlock(block.id)}
              placeholder={block.placeholder}
              className={`${baseClasses} ${typeClasses[block.type]} placeholder-gray-400`}
              rows={1}
              style={{
                minHeight: '1.5rem',
                height: 'auto',
                resize: 'none'
              }}
              onInput={(e: React.FormEvent<HTMLTextAreaElement>) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = target.scrollHeight + 'px';
              }}
            />
            {showMenu.show && showMenu.blockId === block.id && (
              <div
                ref={menuRef}
                className="absolute z-10 bg-white border border-gray-200 rounded-lg shadow-lg py-2 w-64"
                style={{
                  left: '0px',
                  top: menuPositionRef.current === 'bottom' ? 'calc(100% + 8px)' : undefined,
                  bottom: menuPositionRef.current === 'top' ? 'calc(100% + 8px)' : undefined,
                }}
              >
                <div className="px-3 py-2 text-xs text-gray-500 border-b border-gray-100">
                  BASIC BLOCKS
                </div>
                {blockTypes.map(option => (
                  <MenuOption
                    key={option.type}
                    option={option}
                    onClick={(type: string) => changeBlockType(showMenu.blockId!, type)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const MenuOption: React.FC<{ option: typeof blockTypes[0]; onClick: (type: string) => void }> = ({ option, onClick }) => {
    const Icon = option.icon;
    return (
      <button
        onClick={e => {
          e.preventDefault();
          e.stopPropagation();
          onClick(option.type);
        }}
        className="w-full flex items-center px-3 py-2 text-left hover:bg-gray-100 rounded transition-colors"
      >
        <Icon className="w-4 h-4 mr-3 text-gray-500" />
        <span className="text-gray-700">{option.label}</span>
      </button>
    );
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showMenu.show && menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setTimeout(() => {
          setShowMenu({ show: false, blockId: null });
        }, 0);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showMenu.show]);

  return (
    <div 
      className="notes-editor" 
      style={{ background: '#fff', minHeight: 200 }}
      onKeyDown={(e) => {
        // Handle Backspace when cursor is not in any block
        if (e.key === 'Backspace' && document.activeElement === e.currentTarget) {
          
          const currentIndex = blocks.findIndex(b => b.id === activeBlock);
          const prevBlock = blocks[currentIndex - 1];
          
          if (prevBlock && prevBlock.type !== 'divider') {
            e.preventDefault();
            setActiveBlock(prevBlock.id);
            setTimeout(() => {
              const prevTextarea = textareaRefs.current[prevBlock.id];
              if (prevTextarea) {
                prevTextarea.focus();
                prevTextarea.setSelectionRange(prevBlock.content.length, prevBlock.content.length);
              }
            }, 0);
          }
        }
      }}
      tabIndex={0}
    >
      {blocks.map(renderBlock)}
      <div
        className="min-h-[100px] cursor-pointer"
        onClick={() => {
          const lastBlockId = blocks[blocks.length - 1].id;
          addNewBlock(lastBlockId, 'text');
        }}
      />
    </div>
  );
};

export default NotesTab; 