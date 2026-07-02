import re

file_path = 'auditoria_ia.html'

with open(file_path, 'r', encoding='utf-8') as f:
    c = f.read()

replacements = {
    'bg-slate-900/50': 'bg-slate-50',
    'bg-slate-900/40': 'bg-slate-900/40', # modal overlay - leave alone
    'bg-slate-900/70': 'bg-white/70',
    'bg-slate-800/80': 'bg-slate-50',
    'bg-slate-800': 'bg-white',
    'border-white/5': 'border-slate-100',
    'border-white/10': 'border-slate-100',
    'border-slate-700': 'border-slate-200',
    'text-slate-300': 'text-slate-600',
    'text-slate-400': 'text-slate-500',
    'text-slate-200': 'text-slate-800',
    'text-white': 'text-slate-800',
    'text-indigo-400': 'text-indigo-600',
    'bg-indigo-500/20': 'bg-indigo-100',
    'bg-indigo-500/30': 'bg-indigo-100',
    'bg-red-900/30': 'bg-red-50',
    'border-red-500/30': 'border-red-200',
    'text-red-300': 'text-red-800',
    'text-red-400': 'text-red-600',
    'bg-purple-900/30': 'bg-purple-50',
    'text-purple-300': 'text-purple-600',
    'bg-emerald-900/30': 'bg-emerald-50',
    'text-emerald-300': 'text-emerald-600',
    'border-t border-white/10': 'border-t border-slate-100',
    'text-blue-500': 'text-blue-600',
    # Button texts that should remain white
    'class="flex-1 px-6 py-2.5 bg-indigo-600 text-slate-800': 'class="flex-1 px-6 py-2.5 bg-indigo-600 text-white',
    'class="w-4 h-4 text-slate-800': 'class="w-4 h-4 text-white'
}

for old, new in replacements.items():
    c = c.replace(old, new)

# specific fixes for button icons/text that we just broke
c = c.replace('class="w-4 h-4 text-slate-800"', 'class="w-4 h-4 text-white"')
c = c.replace('flex items-center justify-center text-slate-800 shadow-lg', 'flex items-center justify-center text-white shadow-lg')
c = c.replace('bg-indigo-600 text-slate-800', 'bg-indigo-600 text-white')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(c)
