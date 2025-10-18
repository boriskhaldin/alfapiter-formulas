(() => {
    const _eval = window.eval;
    window.eval = function(src){ try{ console.log('[EVAL_CAPTURE]', String(src).slice(0,4000)); }catch(e){} return _eval(src); };
    const _Function = window.Function;
    window.Function = function(...args){ try{ console.log('[FUNCTION_CAPTURE]', String(args[args.length-1]||'').slice(0,4000)); }catch(e){} return _Function(...args); };
  })()