// Trafficker Pro — estilos globales
// Extraído de App.jsx (Fase 1 de modularización)

export const css = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  :root{
    --bg:#080B12;--surface:#0D1220;--surface2:#111827;--border:#1a2540;
    --text:#F0EFF8;--muted:#6B7A99;
    --accent:#004AAD;--accent-glow:rgba(0,74,173,.35);
    --accent2:#FFDE59;--accent2-glow:rgba(255,222,89,.25);
    --orange:#FF914D;--orange-glow:rgba(255,145,77,.25);
    --green:#10B981;--red:#EF4444;--amber:#FFDE59;
    --font:'DM Sans',sans-serif;--mono:'DM Mono',monospace;--r:10px;--r2:16px;
  }
  html,body,#root{height:100%;width:100%}
  body{font-family:var(--font);background:var(--bg);color:var(--text);font-size:14px}
  /* Glow effects con colores de marca */
  .btn-primary{box-shadow:0 0 14px var(--accent-glow)}
  .btn-primary:hover{box-shadow:0 0 22px var(--accent-glow);opacity:1;background:#0057cc}
  .nav-item.active{background:rgba(0,74,173,.18);color:#4d9fff;box-shadow:inset 2px 0 0 var(--accent)}
  .metric{border-color:var(--border)}
  .metric:hover{border-color:rgba(0,74,173,.4);box-shadow:0 0 12px var(--accent-glow)}
  .tab.active{color:#4d9fff;border-bottom-color:var(--accent)}
  .sidebar{background:#0a0f1e;border-right:1px solid var(--border)}
  .topbar{background:#0a0f1e;border-bottom:1px solid var(--border)}
  .sidebar-logo-badge{color:var(--accent2);background:var(--accent2-glow)}
  .login-card{box-shadow:0 0 40px var(--accent-glow)}
  .card{border-color:var(--border)}
  .card:hover{border-color:rgba(0,74,173,.3)}
  .kpi-progress-fill{box-shadow:0 0 8px currentColor}
  .pill.active{background:var(--accent);box-shadow:0 0 10px var(--accent-glow)}
  .fb-chip.active{background:rgba(0,74,173,.2);border-color:var(--accent);color:#4d9fff}
  .col-chip.active{background:rgba(0,74,173,.2);border-color:var(--accent);color:#4d9fff}
  .servicio-chip.selected{background:rgba(0,74,173,.2);border-color:var(--accent);color:#4d9fff}
  .badge-wa{background:rgba(16,185,129,.15);color:#10B981}
  .badge-web{background:rgba(255,222,89,.12);color:#c9a800}
  .badge-launch{background:rgba(255,145,77,.12);color:#FF914D}
  .tbl tr:hover td{background:rgba(0,74,173,.06)}
  /* Highlight accent2 (amarillo) para valores importantes */
  .metric-value[style*="accent"]{text-shadow:0 0 12px var(--accent2-glow)}
  .app{display:flex;height:100vh;overflow:hidden}
  .login{display:flex;align-items:center;justify-content:center;min-height:100vh;padding:2rem;background:var(--bg)}
  .login-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--r2);padding:2.5rem;width:100%;max-width:400px}
  .login-logo{font-size:11px;font-weight:600;letter-spacing:.12em;color:var(--muted);text-transform:uppercase;margin-bottom:2rem}
  .login-title{font-size:24px;font-weight:600;margin-bottom:.4rem}
  .login-sub{color:var(--muted);font-size:13px;margin-bottom:2rem}
  .field{margin-bottom:1rem}
  .field label{display:block;font-size:12px;font-weight:500;color:var(--muted);margin-bottom:6px;text-transform:uppercase;letter-spacing:.06em}
  .input-wrap{position:relative}.input-wrap input{padding-right:40px}
  .eye-btn{position:absolute;right:10px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:var(--muted);padding:4px;display:flex;align-items:center}.eye-btn:hover{color:var(--text)}
  input,select,textarea{width:100%;background:var(--surface2);border:1px solid var(--border);border-radius:var(--r);padding:10px 14px;color:var(--text);font-family:var(--font);font-size:14px;outline:none;transition:border-color .15s}
  input:focus,select:focus,textarea:focus{border-color:var(--accent)}
  input:read-only{opacity:.6;cursor:not-allowed}
  textarea{resize:vertical;min-height:80px}
  .input-prefix{position:relative;display:flex;align-items:center}
  .input-prefix .pre{position:absolute;left:12px;color:var(--muted);font-size:14px;pointer-events:none}
  .input-prefix input{padding-left:24px}
  .btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:10px 18px;border-radius:var(--r);font-family:var(--font);font-size:14px;font-weight:500;cursor:pointer;border:none;transition:all .15s}
  .btn-primary{background:var(--accent);color:#fff}.btn-primary:hover{opacity:.88}.btn-primary:disabled{opacity:.4;cursor:not-allowed}
  .btn-ghost{background:transparent;color:var(--muted);border:1px solid var(--border)}.btn-ghost:hover{color:var(--text);border-color:var(--muted)}
  .btn-danger{background:transparent;color:var(--red);border:1px solid var(--border)}.btn-danger:hover{border-color:var(--red);background:rgba(239,68,68,.08)}
  .btn-green{background:var(--green);color:#fff}.btn-green:hover{opacity:.88}
  .btn-sm{padding:6px 12px;font-size:12px}.btn-full{width:100%}
  .err{color:var(--red);font-size:12px;margin-top:8px}
  /* TOAST */
  .toast{position:fixed;bottom:24px;right:24px;z-index:9999;padding:12px 18px;border-radius:10px;font-size:13px;font-weight:500;display:flex;align-items:center;gap:10px;animation:slideUp .25s ease;max-width:320px;box-shadow:0 4px 24px rgba(0,0,0,.4)}
  .toast-ok{background:#10B981;color:#fff}
  .toast-err{background:#EF4444;color:#fff}
  @keyframes slideUp{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}
  /* DB STATUS */
  .db-status{display:inline-flex;align-items:center;gap:6px;font-size:11px;padding:4px 10px;border-radius:20px;font-weight:600}
  .db-ok{background:rgba(16,185,129,.12);color:var(--green)}
  .db-err{background:rgba(239,68,68,.12);color:var(--red)}
  .db-checking{background:rgba(245,158,11,.12);color:var(--amber)}
  .db-dot{width:6px;height:6px;border-radius:50%;background:currentColor}
  /* LAYOUT */
  .sidebar{width:230px;background:var(--surface);border-right:1px solid var(--border);display:flex;flex-direction:column;height:100vh;overflow-y:auto;flex-shrink:0}
  .sidebar-logo{padding:1.5rem 1.25rem 1rem;border-bottom:1px solid var(--border)}
  .sidebar-logo-badge{font-size:10px;font-weight:600;letter-spacing:.1em;color:var(--accent);text-transform:uppercase;background:rgba(124,58,237,.12);padding:3px 8px;border-radius:4px;display:inline-block;margin-bottom:8px}
  .sidebar-logo-name{font-size:15px;font-weight:600}
  .sidebar-logo-role{font-size:11px;color:var(--muted);margin-top:2px}
  .nav{padding:1rem .75rem;flex:1;overflow-y:auto}
  .nav-label{font-size:10px;font-weight:600;letter-spacing:.1em;color:var(--muted);text-transform:uppercase;padding:0 .5rem;margin-bottom:6px;margin-top:16px}
  .nav-item{display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:8px;cursor:pointer;color:var(--muted);font-size:13px;font-weight:500;transition:all .15s;margin-bottom:2px;user-select:none}
  .nav-item:hover{background:var(--surface2);color:var(--text)}
  .nav-item.active{background:rgba(124,58,237,.15);color:var(--accent)}
  .nav-dot{width:7px;height:7px;border-radius:50%;flex-shrink:0}
  .sidebar-footer{padding:1rem 1.25rem;border-top:1px solid var(--border)}
  .main{flex:1;display:flex;flex-direction:column;min-width:0;height:100vh;overflow:hidden}
  .topbar{background:var(--surface);border-bottom:1px solid var(--border);padding:1rem 1.5rem;display:flex;align-items:center;justify-content:space-between;gap:1rem;flex-wrap:wrap}
  .topbar-title{font-size:16px;font-weight:600}
  .content{padding:1.5rem;flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch}
  /* CARDS */
  .card{background:var(--surface);border:1px solid var(--border);border-radius:var(--r2);padding:1.25rem;margin-bottom:1.25rem}
  .card-title{font-size:11px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);margin-bottom:1rem}
  .card:hover .card-controls{opacity:1!important;transition:opacity .2s}
  .grid2{display:grid;grid-template-columns:1fr 1fr;gap:1rem}
  .grid3{display:grid;grid-template-columns:repeat(3,1fr);gap:1rem}
  .grid4{display:grid;grid-template-columns:repeat(4,1fr);gap:.75rem}
  .metric{background:var(--surface);border:1px solid var(--border);border-radius:var(--r);padding:1rem}
  .metric-label{font-size:11px;color:var(--muted);font-weight:500;text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px}
  .metric-value{font-size:22px;font-weight:600;font-family:var(--mono);line-height:1}
  .metric-sub{font-size:11px;color:var(--muted);margin-top:4px}
  .tbl{width:100%;border-collapse:collapse}
  .tbl th{font-size:10px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);padding:8px 12px;text-align:left;border-bottom:1px solid var(--border)}
  .tbl td{padding:10px 12px;border-bottom:1px solid rgba(42,42,56,.5);font-size:13px}
  .tbl tr:last-child td{border-bottom:none}
  .tbl tr:hover td{background:var(--surface2)}
  .badge{display:inline-flex;align-items:center;padding:3px 9px;border-radius:20px;font-size:11px;font-weight:600}
  .badge-wa{background:rgba(16,185,129,.12);color:var(--green)}
  .badge-web{background:rgba(14,165,233,.12);color:var(--accent2)}
  .badge-launch{background:rgba(249,115,22,.12);color:var(--orange)}
  .badge-paid{background:rgba(16,185,129,.12);color:var(--green)}
  .badge-partial{background:rgba(245,158,11,.12);color:var(--amber)}
  .badge-pending{background:rgba(239,68,68,.12);color:var(--red)}
  .badge-active{background:rgba(16,185,129,.12);color:var(--green)}
  .badge-closed{background:rgba(107,114,128,.12);color:var(--muted)}
  .badge-progress{background:rgba(14,165,233,.12);color:var(--accent2)}
  .avatar{width:36px;height:36px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0}
  .form-row{display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1rem}
  .form-row3{display:grid;grid-template-columns:repeat(3,1fr);gap:1rem;margin-bottom:1rem}
  .section-label{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);margin:1.5rem 0 .75rem;padding-bottom:.5rem;border-bottom:1px solid var(--border)}
  .tab-row{display:flex;gap:4px;border-bottom:1px solid var(--border);margin-bottom:1.25rem;flex-wrap:wrap}
  .tab{padding:8px 14px;font-size:13px;font-weight:500;cursor:pointer;color:var(--muted);border-bottom:2px solid transparent;transition:all .15s;background:none;border-top:none;border-left:none;border-right:none;font-family:var(--font)}
  .tab.active{color:var(--accent);border-bottom-color:var(--accent)}
  .tab:hover:not(.active){color:var(--text)}
  .filter-bar{display:flex;align-items:center;gap:.75rem;margin-bottom:1.25rem;flex-wrap:wrap}
  .period-pills{display:flex;gap:4px;flex-wrap:wrap}
  .pill{padding:5px 12px;border-radius:20px;font-size:12px;font-weight:500;cursor:pointer;border:1px solid var(--border);color:var(--muted);background:transparent;font-family:var(--font);transition:all .15s}
  .pill.active,.pill:hover{background:var(--accent);color:#fff;border-color:var(--accent)}
  /* PROGRESS */
  .progress-stages{display:flex;gap:4px;margin-bottom:.75rem}
  .stage-block{flex:1;position:relative;cursor:pointer}
  .stage-bar{height:8px;border-radius:4px;transition:all .3s}
  .stage-label{font-size:9px;font-weight:600;text-align:center;margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .stage-tooltip{position:absolute;bottom:24px;left:50%;transform:translateX(-50%);background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:8px 12px;font-size:11px;white-space:nowrap;z-index:100;pointer-events:none;opacity:0;transition:opacity .15s;min-width:160px}
  .stage-block:hover .stage-tooltip{opacity:1}
  /* CHECKLIST COLAPSABLE */
  .checklist-service{background:var(--surface2);border-radius:10px;margin-bottom:.75rem;overflow:hidden}
  .checklist-service-header{display:flex;align-items:center;justify-content:space-between;padding:12px 14px;cursor:pointer;user-select:none}
  .checklist-service-header:hover{background:rgba(255,255,255,.03)}
  .checklist-service-body{padding:0 14px 12px}
  .check-item{display:flex;align-items:center;gap:10px;padding:7px 10px;background:var(--bg);border-radius:7px;font-size:13px;margin-bottom:6px}
  .check-item.done{opacity:.55;text-decoration:line-through}
  .check-item input[type=checkbox]{width:15px;height:15px;cursor:pointer;accent-color:var(--accent);flex-shrink:0}
  .chevron{transition:transform .2s;font-size:12px;color:var(--muted)}
  .chevron.open{transform:rotate(180deg)}
  .upgrade-badge{font-size:10px;background:rgba(249,115,22,.12);color:var(--orange);padding:2px 7px;border-radius:10px;font-weight:600;margin-left:auto;white-space:nowrap}
  /* CUENTAS */
  .cuenta-row{display:grid;grid-template-columns:170px 1fr 1fr auto;gap:.75rem;align-items:center;margin-bottom:.75rem}
  /* CONTRATOS COLAPSABLES */
  .contrato-card{border-radius:var(--r);margin-bottom:.75rem;border:1px solid var(--border);overflow:hidden}
  .contrato-header{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;background:var(--surface2);cursor:pointer;user-select:none;gap:12px}
  .contrato-header:hover{background:rgba(255,255,255,.03)}
  .contrato-body{padding:1rem;background:var(--surface)}
  .contrato-actions{display:flex;gap:8px;align-items:center}
  /* ANTECEDENTES */
  .ant-cell-green{background:rgba(16,185,129,.15);color:#10B981;font-weight:600;border-radius:4px;padding:2px 8px;font-family:var(--mono);font-size:12px}
  .ant-cell-amber{background:rgba(245,158,11,.15);color:#F59E0B;font-weight:600;border-radius:4px;padding:2px 8px;font-family:var(--mono);font-size:12px}
  .ant-cell-red{background:rgba(239,68,68,.15);color:#EF4444;font-weight:600;border-radius:4px;padding:2px 8px;font-family:var(--mono);font-size:12px}
  .ant-cell-neutral{color:var(--text);padding:2px 8px;font-family:var(--mono);font-size:12px}
  .ant-calc{background:rgba(124,58,237,.08);border:1px solid rgba(124,58,237,.15);border-radius:8px;padding:10px 12px;font-size:13px;font-family:var(--mono);color:var(--accent)}
  /* CHART */
  .chart-bars{display:flex;align-items:flex-end;gap:6px;height:80px;margin-top:1rem}
  .bar{flex:1;border-radius:4px 4px 0 0;min-height:4px;transition:opacity .15s;cursor:pointer}.bar:hover{opacity:.7}
  /* AI */
  .ai-report{background:rgba(124,58,237,.07);border:1px solid rgba(124,58,237,.25);border-radius:var(--r2);padding:1.25rem;margin-top:1rem}
  .ai-report-header{display:flex;align-items:center;gap:8px;margin-bottom:.75rem;font-size:12px;font-weight:600;color:var(--accent);text-transform:uppercase;letter-spacing:.08em}
  .ai-report-body{font-size:13px;line-height:1.7;color:var(--text);white-space:pre-wrap}
  .streaming-cursor::after{content:'▌';animation:blink .7s step-end infinite}
  @keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
  /* PROYECCIONES */
  .kpi-card{background:var(--surface2);border-radius:var(--r);padding:1rem;margin-bottom:.75rem;border:1px solid var(--border)}
  .kpi-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:.75rem;gap:12px}
  .kpi-progress-bar{height:10px;background:var(--border);border-radius:5px;overflow:hidden;margin:.5rem 0}
  .kpi-progress-fill{height:100%;border-radius:5px;transition:width .4s ease}
  .kpi-relevance-high{color:var(--red);font-weight:600;font-size:11px}
  .kpi-relevance-mid{color:var(--amber);font-weight:600;font-size:11px}
  .kpi-relevance-low{color:var(--green);font-weight:600;font-size:11px}
  .funnel-wrap{display:flex;flex-direction:column;align-items:center;gap:6px;padding:1rem 0}
  .funnel-stage{display:flex;align-items:center;width:100%;transition:all .3s}
  .funnel-bar{height:44px;border-radius:6px;display:flex;align-items:center;justify-content:space-between;padding:0 14px;font-size:13px;font-weight:500;transition:width .4s ease;min-width:120px}
  .funnel-label{font-size:12px;color:var(--muted);width:100px;text-align:right;margin-right:12px;flex-shrink:0}
  .funnel-count{font-family:var(--mono);font-size:13px;color:var(--muted);width:80px;text-align:left;margin-left:12px;flex-shrink:0}
  .funnel-pct{font-size:11px;opacity:.7;margin-left:6px}
  /* BANNER */
  .banner-wrap{width:100%;overflow:hidden;border-radius:var(--r2);background:var(--surface);position:relative;user-select:none}
  .banner-track{display:flex;transition:transform .4s ease}
  .banner-slide{flex-shrink:0;width:100%;max-height:320px;object-fit:contain;object-position:center;display:block;background:#000}
  .banner-dots{position:absolute;bottom:10px;left:50%;transform:translateX(-50%);display:flex;gap:6px}
  .banner-dot{width:8px;height:8px;border-radius:50%;background:rgba(255,255,255,.4);cursor:pointer;border:none;transition:background .2s}
  .banner-dot.active{background:#fff}
  .banner-arrow{position:absolute;top:50%;transform:translateY(-50%);background:rgba(0,0,0,.4);border:none;color:#fff;width:32px;height:32px;border-radius:50%;cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center;transition:background .15s}
  .banner-arrow:hover{background:rgba(0,0,0,.7)}
  .banner-arrow.left{left:12px}
  .banner-arrow.right{right:12px}
  .banner-admin-card{background:var(--surface2);border-radius:10px;padding:1rem;margin-bottom:.75rem;border:1px solid var(--border)}
  .banner-preview{width:100%;height:120px;object-fit:cover;border-radius:8px;background:var(--border);display:block;margin-top:8px}
  .banner-hint{font-size:11px;color:var(--muted);opacity:.7;margin-top:6px;line-height:1.5}
  /* COLUMN SELECTOR */
  .col-selector{display:flex;flex-wrap:wrap;gap:6px;padding:10px;background:var(--surface2);border-radius:var(--r);margin-bottom:1rem}
  .col-chip{padding:4px 10px;border-radius:20px;font-size:11px;font-weight:500;cursor:pointer;border:1px solid var(--border);color:var(--muted);background:transparent;transition:all .15s;user-select:none}
  .col-chip.active{background:rgba(124,58,237,.15);border-color:var(--accent);color:var(--accent)}
  /* TELEGRAM VIEW/EDIT */
  .tg-plantilla-view{background:var(--surface2);border-radius:10px;padding:12px;margin-bottom:8px;cursor:pointer;border:1px solid var(--border);transition:border-color .15s}
  .tg-plantilla-view:hover{border-color:var(--accent2)}
  .tg-plantilla-view.selected{border-color:var(--accent2);background:rgba(14,165,233,.06)}
  /* NOTIFICACIONES */
  .notif-bell{position:relative;cursor:pointer;padding:6px;border-radius:8px;display:flex;align-items:center;transition:background .15s}
  .notif-bell:hover{background:var(--surface2)}
  .notif-badge{position:absolute;top:2px;right:2px;background:var(--red);color:#fff;border-radius:50%;width:16px;height:16px;font-size:9px;font-weight:700;display:flex;align-items:center;justify-content:center;line-height:1}
  .notif-dropdown{position:absolute;top:calc(100% + 8px);right:0;background:var(--surface);border:1px solid var(--border);border-radius:var(--r2);width:320px;box-shadow:0 8px 32px rgba(0,0,0,.5);z-index:500;overflow:hidden}
  .notif-item{display:flex;gap:10px;padding:12px 14px;border-bottom:1px solid var(--border);cursor:pointer;transition:background .15s}
  .notif-item:hover{background:var(--surface2)}
  .notif-item:last-child{border-bottom:none}
  .notif-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0;margin-top:4px}
  .notif-dot-red{background:var(--red);box-shadow:0 0 6px var(--red)}
  .notif-dot-amber{background:var(--amber);box-shadow:0 0 6px var(--amber)}
  .notif-dot-blue{background:#4d9fff;box-shadow:0 0 6px var(--accent)}
  /* ONBOARDING */
  .onboarding-overlay{position:fixed;inset:0;background:rgba(0,0,0,.85);display:flex;align-items:flex-start;justify-content:center;z-index:2000;padding:1rem;overflow-y:auto}
  .onboarding-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--r2);padding:2rem;width:100%;max-width:560px;box-shadow:0 0 60px var(--accent-glow);margin:auto}
  .onboarding-steps{display:flex;gap:6px;margin-bottom:2rem}
  .onboarding-step{height:4px;flex:1;border-radius:2px;transition:background .3s}
  .onboarding-step.done{background:var(--accent)}
  .onboarding-step.active{background:var(--accent2)}
  .onboarding-step.pending{background:var(--border)}
  /* HEALTH DASHBOARD */
  .health-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--r2);padding:1.25rem;margin-bottom:1rem}
  .health-row{display:flex;align-items:center;gap:12px;padding:8px 0;border-bottom:1px solid rgba(26,37,64,.8);font-size:13px}
  .health-row:last-child{border-bottom:none}
  .health-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}
  .health-ok{background:var(--green);box-shadow:0 0 6px var(--green)}
  .health-warn{background:var(--amber);box-shadow:0 0 6px var(--amber)}
  .health-err{background:var(--red);box-shadow:0 0 6px var(--red)}
  /* HERMES PRODUCT */
  .hermes-progress-wrap{width:100%;background:var(--surface);border:1px solid var(--border);border-radius:var(--r2);padding:1.25rem;margin-bottom:1.25rem;overflow:hidden}
  .hermes-track{position:relative;height:48px;background:linear-gradient(90deg,#0a0f1e 0%,#0d1a3a 50%,#1a0a2e 100%);border-radius:10px;overflow:hidden;margin:1rem 0}
  .hermes-stars{position:absolute;inset:0;background-image:radial-gradient(1px 1px at 20% 30%,rgba(255,222,89,.6) 0%,transparent 100%),radial-gradient(1px 1px at 60% 20%,rgba(255,255,255,.4) 0%,transparent 100%),radial-gradient(1px 1px at 80% 60%,rgba(255,222,89,.3) 0%,transparent 100%),radial-gradient(1px 1px at 40% 70%,rgba(255,255,255,.3) 0%,transparent 100%),radial-gradient(1px 1px at 90% 40%,rgba(255,222,89,.5) 0%,transparent 100%)}
  .hermes-fill{position:absolute;left:0;top:0;bottom:0;background:linear-gradient(90deg,rgba(0,74,173,.3),rgba(255,222,89,.15));transition:width .8s ease;border-right:2px solid var(--accent2)}
  .hermes-carriage{position:absolute;top:50%;transform:translateY(-50%);font-size:22px;transition:left .8s ease;filter:drop-shadow(0 0 8px rgba(255,222,89,.8))}
  .hermes-temple{position:absolute;right:8px;top:50%;transform:translateY(-50%);font-size:20px;filter:drop-shadow(0 0 6px rgba(255,222,89,.6))}
  .hermes-checkpoints{display:flex;justify-content:space-between;padding:0 4px}
  .hermes-cp{display:flex;flex-direction:column;align-items:center;gap:4px;cursor:pointer;flex:1}
  .hermes-cp-dot{width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;border:2px solid var(--border);transition:all .2s}
  .hermes-cp-dot.done{background:var(--accent2);border-color:var(--accent2);box-shadow:0 0 10px rgba(255,222,89,.5)}
  .hermes-cp-dot.active{background:rgba(255,222,89,.2);border-color:var(--accent2);animation:pulse 2s infinite}
  @keyframes pulse{0%,100%{box-shadow:0 0 0 0 rgba(255,222,89,.4)}50%{box-shadow:0 0 0 6px rgba(255,222,89,0)}}
  .hermes-cp-label{font-size:9px;color:var(--muted);text-align:center;max-width:70px;line-height:1.2}
  /* KPI COMPARATIVO */
  .kpi-compare-table{width:100%;border-collapse:collapse}
  .kpi-compare-table th{font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);padding:8px 12px;border-bottom:1px solid var(--border);text-align:left}
  .kpi-compare-table td{padding:10px 12px;border-bottom:1px solid rgba(26,37,64,.6);font-size:13px}
  .kpi-compare-table tr:last-child td{border-bottom:none}
  .delta-up{color:var(--green);font-weight:600;font-size:12px}
  .delta-down{color:var(--red);font-weight:600;font-size:12px}
  .delta-neutral{color:var(--muted);font-size:12px}
  /* BIBLIOTECA */
  .biblioteca-row{display:grid;gap:.75rem;align-items:center;padding:10px 12px;border-bottom:1px solid rgba(26,37,64,.6);font-size:13px}
  .biblioteca-row:hover{background:rgba(0,74,173,.04)}
  .iv-badge{display:inline-flex;align-items:center;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;font-family:var(--mono)}
  .iv-green{background:rgba(16,185,129,.15);color:var(--green);box-shadow:0 0 8px rgba(16,185,129,.2)}
  .iv-amber{background:rgba(255,222,89,.12);color:#c9a800;box-shadow:0 0 8px rgba(255,222,89,.15)}
  .iv-red{background:rgba(239,68,68,.12);color:var(--red)}
  /* EMBUDO HERMES - forma real de embudo */
  .funnel-container{display:flex;flex-direction:column;align-items:center;gap:2px;padding:.75rem 0;width:100%}
  .funnel-level{display:flex;flex-direction:column;align-items:center;width:100%}
  .funnel-shape{display:flex;align-items:center;justify-content:space-between;padding:0 16px;color:#fff;font-weight:600;font-size:12px;transition:width .5s;clip-path:polygon(5% 0%,95% 0%,100% 100%,0% 100%);border-radius:2px}
  .funnel-connector{width:2px;height:6px;background:var(--border)}
  .funnel-label-row{display:flex;justify-content:space-between;width:100%;padding:2px 4px;margin-bottom:2px}
  .funnel-stage-label{font-size:10px;color:var(--muted);font-weight:600;text-transform:uppercase;letter-spacing:.06em}
  .funnel-stage-val{font-size:11px;font-family:var(--mono);font-weight:700}
  .funnel-conv-badge{font-size:10px;color:var(--muted);background:var(--surface2);padding:1px 6px;border-radius:8px}
  /* CALENDARIO */
  .cal-wrap{background:var(--surface);border:1px solid var(--border);border-radius:var(--r2);overflow:hidden}
  .cal-header{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1px solid var(--border)}
  .cal-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:1px;background:var(--border)}
  .cal-cell{background:var(--surface);padding:6px 4px;min-height:64px;cursor:pointer;transition:background .15s;position:relative}
  .cal-cell:hover{background:var(--surface2)}
  .cal-cell.today{background:rgba(0,74,173,.1);border:1px solid rgba(0,74,173,.3)}
  .cal-cell.disabled{opacity:.3;cursor:default;pointer-events:none}
  .cal-cell.available{background:rgba(16,185,129,.06)}
  .cal-day{font-size:11px;font-weight:600;color:var(--muted);margin-bottom:4px}
  .cal-day.today-num{color:var(--accent);font-weight:700}
  .cal-event{font-size:10px;padding:1px 5px;border-radius:4px;margin-bottom:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;cursor:pointer}
  .cal-event-grabacion{background:rgba(0,74,173,.25);color:#4d9fff}
  .cal-event-reunion{background:rgba(255,222,89,.2);color:#c9a800}
  .cal-event-metricas{background:rgba(16,185,129,.2);color:var(--green)}
  .cal-dow{font-size:10px;font-weight:600;color:var(--muted);text-transform:uppercase;text-align:center;padding:6px 0;background:var(--surface2)}
  .hermes-funnel{display:flex;flex-direction:column;gap:6px;align-items:center;padding:1rem 0}
  .hf-stage{display:flex;align-items:center;width:100%;max-width:500px;gap:12px}
  .hf-bar{height:40px;border-radius:6px;display:flex;align-items:center;justify-content:space-between;padding:0 14px;font-size:12px;font-weight:600;transition:width .5s ease;min-width:80px}
  .hf-label{font-size:11px;color:var(--muted);width:90px;text-align:right;flex-shrink:0}
  .hf-pct{font-size:11px;color:var(--muted);width:50px;flex-shrink:0}
  /* FILMMAKER */
  .fm-badge{display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:20px;font-size:10px;font-weight:700;background:rgba(255,145,77,.15);color:var(--orange);border:1px solid rgba(255,145,77,.3)}
  .fm-avail-chip{padding:4px 10px;border-radius:20px;font-size:11px;cursor:pointer;border:1px solid var(--border);transition:all .15s;user-select:none}
  .fm-avail-chip.available{background:rgba(16,185,129,.15);border-color:var(--green);color:var(--green)}
  .fm-avail-chip.unavailable{background:rgba(239,68,68,.1);border-color:var(--red);color:var(--red)}
  /* ESTUDIO */
  .ficha-wrap{background:var(--surface);border:1px solid var(--border);border-radius:var(--r2);overflow:hidden;margin-bottom:.75rem;transition:border-color .15s}
  .ficha-wrap:hover{border-color:rgba(0,74,173,.3)}
  .ficha-header{display:flex;align-items:center;gap:12px;padding:12px 16px;cursor:pointer;background:var(--surface2)}
  .ficha-estado{display:inline-flex;align-items:center;padding:3px 10px;border-radius:20px;font-size:10px;font-weight:700}
  .estado-borrador{background:rgba(107,117,153,.15);color:var(--muted)}
  .estado-revision{background:rgba(255,222,89,.12);color:#c9a800}
  .estado-aprobado{background:rgba(16,185,129,.15);color:var(--green)}
  .estado-grabado{background:rgba(0,74,173,.15);color:#4d9fff}
  .estado-edicion{background:rgba(255,145,77,.12);color:var(--orange)}
  .ficha-field{margin-bottom:.75rem}
  .ficha-field label{font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);display:block;margin-bottom:4px}
  .ficha-field .ficha-value{font-size:13px;color:var(--text);line-height:1.6;white-space:pre-wrap;background:var(--surface2);border-radius:8px;padding:8px 12px;min-height:32px}
  .ficha-field textarea{min-height:80px;resize:vertical;font-size:13px;line-height:1.6}
  .stars-wrap{display:flex;gap:4px}
  .star{font-size:20px;cursor:pointer;transition:transform .1s;user-select:none}
  .star:hover{transform:scale(1.2)}
  .nota-cliente{background:rgba(255,222,89,.06);border:1px solid rgba(255,222,89,.2);border-radius:8px;padding:10px 12px;font-size:12px;margin-top:4px}
  /* Ocultar flechas nativas de input number en todos los browsers */
  input[type=number]::-webkit-inner-spin-button,
  input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
  input[type=number] { -moz-appearance: textfield; }
  /* FACEBOOK */
  .fb-card{background:rgba(24,119,242,.08);border:1px solid rgba(24,119,242,.25);border-radius:var(--r2);padding:1.25rem;margin-bottom:1rem}
  .fb-header{display:flex;align-items:center;gap:10px;margin-bottom:.75rem;font-size:13px;font-weight:600;color:#1877F2}
  .fb-metric-row{display:flex;align-items:center;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border);font-size:13px}
  .fb-metric-row:last-child{border-bottom:none}
  .fb-chip{display:inline-flex;align-items:center;gap:5px;padding:4px 10px;border-radius:20px;font-size:11px;font-weight:500;cursor:pointer;border:1px solid var(--border);transition:all .15s;user-select:none}
  .fb-chip.active{background:rgba(24,119,242,.15);border-color:#1877F2;color:#1877F2}
  .fb-sync-badge{font-size:11px;padding:2px 8px;border-radius:10px;font-weight:600}
  .fb-sync-ok{background:rgba(16,185,129,.12);color:var(--green)}
  .fb-sync-err{background:rgba(239,68,68,.12);color:var(--red)}
  .fb-sync-loading{background:rgba(245,158,11,.12);color:var(--amber)}
  /* TELEGRAM */
  .tg-card{background:rgba(14,165,233,.08);border:1px solid rgba(14,165,233,.25);border-radius:var(--r2);padding:1.25rem;margin-top:1rem}
  .tg-header{display:flex;align-items:center;gap:10px;margin-bottom:.75rem;font-size:13px;font-weight:600;color:var(--accent2)}
  /* MISC */
  .scroll-x{overflow-x:auto}
  .empty{text-align:center;padding:3rem 1rem;color:var(--muted)}
  .sec-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:1.25rem}
  .sec-title{font-size:15px;font-weight:600}
  .info-row{display:flex;gap:.5rem;align-items:baseline;margin-bottom:.5rem;font-size:13px}
  .info-label{color:var(--muted);min-width:140px;font-size:12px}
  .loading-screen{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;gap:16px;color:var(--muted)}
  .spinner{width:32px;height:32px;border:3px solid var(--border);border-top-color:var(--accent);border-radius:50%;animation:spin .8s linear infinite}
  @keyframes spin{to{transform:rotate(360deg)}}
  .modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.75);display:flex;align-items:center;justify-content:center;z-index:1000;padding:1rem}
  .modal-box{background:var(--surface);border:1px solid var(--border);border-radius:var(--r2);padding:2rem;max-width:480px;width:100%}
  .modal-title{font-size:18px;font-weight:600;margin-bottom:.75rem}
  .modal-body{color:var(--muted);font-size:14px;line-height:1.6;margin-bottom:1.5rem}
  .servicio-chip{display:inline-flex;align-items:center;gap:6px;padding:5px 10px;border-radius:6px;font-size:12px;font-weight:500;cursor:pointer;border:1px solid var(--border);transition:all .15s;user-select:none}
  .servicio-chip.selected{background:rgba(124,58,237,.15);border-color:var(--accent);color:var(--accent)}
  .chips-wrap{display:flex;flex-wrap:wrap;gap:8px;margin-top:.5rem}
  @media(max-width:640px){.sidebar{display:none}.grid4{grid-template-columns:1fr 1fr}.grid3{grid-template-columns:1fr 1fr}.form-row,.form-row3{grid-template-columns:1fr}.cuenta-row{grid-template-columns:1fr 1fr}}
  @media(max-width:900px){.grid4{grid-template-columns:1fr 1fr}.onboarding-card{padding:1.25rem}.tab-row{overflow-x:auto;flex-wrap:nowrap}}
  /* Zoom alto: asegurar que el contenido siga siendo navegable */
  @media(max-height:600px){.onboarding-overlay{align-items:flex-start;padding:.5rem}.onboarding-card{margin:.5rem auto}.sidebar{height:100vh}}
  /* Scrollbar estilizado */
  ::-webkit-scrollbar{width:5px;height:5px}
  ::-webkit-scrollbar-track{background:transparent}
  ::-webkit-scrollbar-thumb{background:var(--border);border-radius:10px}
  ::-webkit-scrollbar-thumb:hover{background:var(--muted)}
`;
