/* ============================================================
   script.js
   Mini-DB con LocalStorage + Login + Admin + Usuario
   Compatible con GitHub Pages (solo HTML/CSS/JS)
   ============================================================ */

/* -----------------------
   Utilidades y UID
   ----------------------- */
   const LS_KEY_DB = "banco_db_v1";
   const LS_KEY_SESION = "banco_sesion_v1";
   
   function uid(prefix = "") {
     return prefix + Date.now().toString(36) + Math.floor(Math.random()*1000).toString(36);
   }
   
   /* -----------------------
      DB: estructura inicial
      ----------------------- */
   function dbDefault() {
     return {
       usuarios: [
         // admin por defecto (cámbialo si quieres)
         {
           id: "U_admin",
           nombre: "Administrador",
           usuario: "admin",
           password: "admin123",
           tipo: "admin", // admin | usuario
           chequeraHabilitada: false
         },
         // ejemplo usuario
         {
           id: "U_juan",
           nombre: "Juan Pérez",
           usuario: "juan",
           password: "1111",
           tipo: "usuario",
           chequeraHabilitada: true
         }
       ],
       cuentas: [
         // ejemplo cuenta vinculada a Juan
         {
           id: "C_" + uid(),
           numero: "ACC-1001",
           usuarioId: "U_juan",
           saldo: 1500
         }
       ],
       transacciones: [
         // cada transacción: { id, cuentaId, usuarioId, tipo, monto, fecha, nota }
       ]
     };
   }
   
   function getDB() {
     const raw = localStorage.getItem(LS_KEY_DB);
     if (!raw) {
       const initial = dbDefault();
       localStorage.setItem(LS_KEY_DB, JSON.stringify(initial));
       return initial;
     }
     try {
       return JSON.parse(raw);
     } catch (e) {
       console.error("DB corrupta — recreando", e);
       const initial = dbDefault();
       localStorage.setItem(LS_KEY_DB, JSON.stringify(initial));
       return initial;
     }
   }
   
   function saveDB(db) {
     localStorage.setItem(LS_KEY_DB, JSON.stringify(db));
     // disparar evento storage manual para mismas pestañas (no lo hace localStorage.setItem)
     // otras pestañas verán el cambio automáticamente por storage event
     // aquí refrescamos vistas actuales si hay elementos correspondientes
     if (window.location.pathname.includes("panel_admin.html")) {
       try { renderCuentas(); renderClientes(); renderTransaccionesAdmin(); } catch(e){}
     }
     if (window.location.pathname.includes("panel_usuario.html")) {
       try { renderPanelUsuario(); renderUserHome(); renderUserHistory(); } catch(e){}
     }
   }
   
   /* -----------------------
      Sesión
      ----------------------- */
   function getSesion() {
     const s = localStorage.getItem(LS_KEY_SESION);
     if (!s) return null;
     try { return JSON.parse(s); } catch { return null; }
   }
   function setSesion(obj) {
     localStorage.setItem(LS_KEY_SESION, JSON.stringify(obj));
   }
   function clearSesion() {
     localStorage.removeItem(LS_KEY_SESION);
   }
   
   /* -----------------------
      Login / Logout
      ----------------------- */
   function login() {
     const elUser = document.getElementById("usuario");
     const elPass = document.getElementById("password");
     if (!elUser || !elPass) return;
   
     const usuario = elUser.value.trim();
     const password = elPass.value.trim();
   
     const db = getDB();
     const found = db.usuarios.find(u => u.usuario === usuario && u.password === password);
   
     if (!found) {
       // muestra error si hay elemento #error
       const e = document.getElementById("error");
       if (e) e.innerText = "Usuario o contraseña incorrectos";
       else alert("Usuario o contraseña incorrectos");
       return;
     }
   
     // guardar sesión (solo datos necesarios)
     setSesion({ id: found.id, usuario: found.usuario, tipo: found.tipo });
   
     // redirección según tipo
     if (found.tipo === "admin") {
       window.location.href = "panel_admin.html";
     } else {
       window.location.href = "panel_usuario.html";
     }
   }
   
   function logout() {
     clearSesion();
     window.location.href = "login.html";
   }
   
   /* -----------------------
      Admin: render y acciones
      ----------------------- */
   
   // Cambia la vista activa en el admin
   function mostrarSeccion(id) {
     document.querySelectorAll(".seccion").forEach(s => s.style.display = "none");
     const target = document.getElementById(id);
     if (target) target.style.display = "block";
   
     if (id === "seccionCuentas") renderCuentas();
     if (id === "seccionClientes") renderClientes();
     if (id === "seccionTransacciones") renderTransaccionesAdmin();
   }
   
   // Render cuentas
   function renderCuentas() {
     const cont = document.getElementById("listaCuentas");
     if (!cont) return;
     const db = getDB();
     if (db.cuentas.length === 0) {
       cont.innerHTML = "<p>No hay cuentas registradas.</p>";
       return;
     }
     cont.innerHTML = db.cuentas.map(c => {
       const user = db.usuarios.find(u => u.id === c.usuarioId) || { nombre: "Sin asignar" };
       return `
         <div class="card">
           <h3>${user.nombre}</h3>
           <p><b>Nº Cuenta:</b> ${c.numero}</p>
           <p><b>Saldo:</b> ${c.saldo.toFixed(2)} Bs</p>
           <p><b>Cuenta ID:</b> ${c.id}</p>
         </div>
       `;
     }).join("");
   }
   
   // Render clientes + botones para habilitar/deshabilitar + crear nuevo
   function renderClientes() {
     const cont = document.getElementById("listaClientes");
     if (!cont) return;
     const db = getDB();
     const usuarios = db.usuarios.filter(u => u.tipo === "usuario");
     if (usuarios.length === 0) {
       cont.innerHTML = "<p>No hay clientes.</p>";
       return;
     }
   
     cont.innerHTML = usuarios.map(u => {
       const cuenta = db.cuentas.find(c => c.usuarioId === u.id);
       const cuentaInfo = cuenta ? `Cuenta: ${cuenta.numero} • Saldo: ${cuenta.saldo.toFixed(2)} Bs` : "Sin cuenta asignada";
       return `
         <div class="card">
           <h3>${u.nombre} (${u.usuario})</h3>
           <p><b>ID:</b> ${u.id}</p>
           <p>${cuentaInfo}</p>
           <p><b>Chequera:</b> ${u.chequeraHabilitada ? '<span style="color:#7CFFB2">Habilitada ✔</span>' : '<span style="color:#FF9E9E">Deshabilitada ✘</span>'}</p>
           <div style="margin-top:10px;">
             <button onclick="adminHabilitarChequera('${u.id}')">Habilitar</button>
             <button onclick="adminDeshabilitarChequera('${u.id}')" class="danger">Deshabilitar</button>
             <button onclick="adminVerMovimientos('${u.id}')">Ver Movimientos</button>
           </div>
         </div>
       `;
     }).join("");
   }
   
   // Admin habilitar/deshabilitar chequera por usuarioId
   function adminHabilitarChequera(usuarioId) {
     const db = getDB();
     const user = db.usuarios.find(u => u.id === usuarioId);
     if (!user) return alert("Usuario no encontrado");
     user.chequeraHabilitada = true;
     saveDB(db);
     renderClientes();
     alert(`Chequera habilitada para ${user.nombre}`);
   }
   
   function adminDeshabilitarChequera(usuarioId) {
     const db = getDB();
     const user = db.usuarios.find(u => u.id === usuarioId);
     if (!user) return alert("Usuario no encontrado");
     user.chequeraHabilitada = false;
     saveDB(db);
     renderClientes();
     alert(`Chequera deshabilitada para ${user.nombre}`);
   }
   
   // Mostrar transacciones en admin: todas las transacciones ordenadas por fecha
   function renderTransaccionesAdmin() {
     const cont = document.getElementById("listaTransaccionesAdmin");
     if (!cont) return;
     const db = getDB();
   
     if (db.transacciones.length === 0) {
       cont.innerHTML = "<p>No hay transacciones registradas.</p>";
       return;
     }
   
     // ordenar por fecha descendente
     const txs = [...db.transacciones].sort((a,b) => new Date(b.fecha) - new Date(a.fecha));
   
     cont.innerHTML = `
       <table style="width:100%; border-collapse:collapse;">
         <thead>
           <tr><th>Fecha</th><th>Usuario</th><th>Cuenta</th><th>Tipo</th><th>Monto</th><th>Nota</th></tr>
         </thead>
         <tbody>
           ${txs.map(t => {
             const u = db.usuarios.find(x => x.id === t.usuarioId) || { nombre: "—" };
             const c = db.cuentas.find(x => x.id === t.cuentaId) || { numero: "—" };
             return `<tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
               <td style="padding:8px;">${t.fecha}</td>
               <td style="padding:8px;">${u.nombre}</td>
               <td style="padding:8px;">${c.numero}</td>
               <td style="padding:8px;">${t.tipo}</td>
               <td style="padding:8px;">${t.monto.toFixed(2)} Bs</td>
               <td style="padding:8px;">${t.nota || ""}</td>
             </tr>`;
           }).join("")}
         </tbody>
       </table>
     `;
   }
   
   /* -----------------------
      Admin: crear usuario y cuenta (funciones utilitarias)
      - puedes crear botones que llamen estas funciones
      ----------------------- */
   function crearUsuario(nombre, usuario, password) {
     const db = getDB();
     if (db.usuarios.some(u => u.usuario === usuario)) {
       return { ok: false, msg: "El usuario ya existe" };
     }
     const nuevo = {
       id: uid("U_"),
       nombre,
       usuario,
       password,
       tipo: "usuario",
       chequeraHabilitada: false
     };
     db.usuarios.push(nuevo);
     saveDB(db);
     return { ok: true, user: nuevo };
   }
   
   function crearCuentaParaUsuario(usuarioId, numero = null, saldoInicial = 0) {
     const db = getDB();
     const user = db.usuarios.find(u => u.id === usuarioId);
     if (!user) return { ok: false, msg: "Usuario no encontrado" };
     const cuenta = {
       id: uid("C_"),
       numero: numero || "ACC-" + Math.floor(Math.random()*900000+100000),
       usuarioId: usuarioId,
       saldo: Number(saldoInicial) || 0
     };
     db.cuentas.push(cuenta);
     saveDB(db);
     return { ok: true, cuenta };
   }
   
   /* -----------------------
      Transacciones (desde usuario)
      ----------------------- */
   function registrarTransaccion({ usuarioId, cuentaId, tipo, monto, nota = "" }) {
     const db = getDB();
     const cuenta = db.cuentas.find(c => c.id === cuentaId);
     if (!cuenta) return { ok: false, msg: "Cuenta no encontrada" };
   
     const montoNum = Number(monto);
     if (isNaN(montoNum)) return { ok: false, msg: "Monto inválido" };
   
     // aplicar lógica saldo
     if (tipo === "Retiro" && cuenta.saldo < montoNum) return { ok: false, msg: "Saldo insuficiente" };
   
     cuenta.saldo = (tipo === "Retiro") ? (cuenta.saldo - montoNum) : (cuenta.saldo + montoNum);
   
     const tx = {
       id: uid("T_"),
       usuarioId,
       cuentaId,
       tipo,
       monto: montoNum,
       fecha: new Date().toLocaleString(),
       nota
     };
   
     db.transacciones.push(tx);
     saveDB(db);
   
     // si la sesión del usuario está activa, actualizarla también
     const ses = getSesion();
     if (ses && ses.id === usuarioId) {
       // actualizar la copia de sesión y persistir (no almacenamos saldo en sesión)
       setSesion(ses);
     }
   
     return { ok: true, tx };
   }
   
   /* -----------------------
      Panel Usuario: render y acciones
      ----------------------- */
   
   function obtenerCuentaDeUsuario(usuarioId) {
     const db = getDB();
     return db.cuentas.find(c => c.usuarioId === usuarioId) || null;
   }
   
   function renderPanelUsuario() {
     const ses = getSesion();
     if (!ses) return; // no hay sesión
     if (!window.location.pathname.includes("panel_usuario")) return;
   
     const db = getDB();
     const user = db.usuarios.find(u => u.id === ses.id);
     if (!user) {
       // si no existe en DB, cerrar sesión
       clearSesion();
       window.location.href = "login.html";
       return;
     }
   
     // actualizar nombre en navbar si existe el elemento
     const elNombre = document.getElementById("usuarioNombre") || document.getElementById("userName");
     if (elNombre) elNombre.innerText = user.nombre;
   
     // cuenta
     const cuenta = obtenerCuentaDeUsuario(user.id);
     const saldoEl = document.getElementById("saldoActual") || document.getElementById("userHomeSaldo");
     if (saldoEl) saldoEl.innerText = (cuenta ? cuenta.saldo.toFixed(2) + " Bs" : "Sin cuenta");
   
     // chequera: mostrar enlace/opción si habilitada
     const opChequera = document.getElementById("opChequera");
     if (opChequera) opChequera.style.display = user.chequeraHabilitada ? "block" : "none";
   
     // transacciones propias
     const cont = document.getElementById("listaTransacciones") || document.getElementById("movimientosUsuario") || document.getElementById("userHistoryList");
     if (cont) {
       const txs = db.transacciones.filter(t => t.usuarioId === user.id).sort((a,b) => new Date(b.fecha) - new Date(a.fecha));
       // si es un contenedor UL
       if (cont.tagName && cont.tagName.toLowerCase() === "ul") {
         cont.innerHTML = txs.length === 0 ? "<li>No hay movimientos.</li>" :
           txs.map(t => `<li><b>${t.tipo}</b> ${t.monto.toFixed(2)} Bs <br><small>${t.fecha}</small></li>`).join("");
       } else {
         cont.innerHTML = txs.length === 0 ? "<p>No hay movimientos.</p>" :
           txs.map(t => `<div class="card"><p><b>${t.tipo}</b> ${t.monto.toFixed(2)} Bs<br><small>${t.fecha}</small></p></div>`).join("");
       }
     }
   }
   
   // acciones depositar / retirar desde panel_usuario
   // Mantengo las versiones antiguas (prompt) y agrego compatibilidad con inputs.
   function usuarioDepositar() {
     // si existe input con id 'montoDeposito' usamos input, sino prompt
     const input = document.getElementById("montoDeposito") || document.getElementById("depositInput") || document.getElementById("depositAmount") || document.getElementById("montoDeposito");
     if (input) {
       const monto = parseFloat(input.value);
       if (isNaN(monto) || monto <= 0) return showToast("Monto inválido");
       return usuarioDepositarConMonto(monto);
     }
     // fallback
     const montoPrompt = parseFloat(prompt("Monto a depositar:"));
     if (isNaN(montoPrompt) || montoPrompt <= 0) return showToast("Monto inválido");
     return usuarioDepositarConMonto(montoPrompt);
   }
   
   function usuarioDepositarConMonto(monto) {
     const ses = getSesion();
     if (!ses) return showToast("No has iniciado sesión");
     const cuenta = obtenerCuentaDeUsuario(ses.id);
     if (!cuenta) return showToast("No tienes cuenta asignada");
     const res = registrarTransaccion({ usuarioId: ses.id, cuentaId: cuenta.id, tipo: "Depósito", monto, nota: "Depósito web" });
     if (!res.ok) return showToast(res.msg || "Error en transacción");
     showToast("Depósito realizado ✔");
     renderPanelUsuario();
     // si estamos en admin, actualizar vista también
     if (window.location.pathname.includes("panel_admin")) {
       renderCuentas(); renderTransaccionesAdmin();
     }
   }
   
   function usuarioRetirar() {
     const input = document.getElementById("montoRetiro") || document.getElementById("withdrawInput") || document.getElementById("withdrawAmount");
     if (input) {
       const monto = parseFloat(input.value);
       if (isNaN(monto) || monto <= 0) return showToast("Monto inválido");
       return usuarioRetirarConMonto(monto);
     }
     // fallback
     const montoPrompt = parseFloat(prompt("Monto a retirar:"));
     if (isNaN(montoPrompt) || montoPrompt <= 0) return showToast("Monto inválido");
     return usuarioRetirarConMonto(montoPrompt);
   }
   
   function usuarioRetirarConMonto(monto) {
     const ses = getSesion();
     if (!ses) return showToast("No has iniciado sesión");
     const cuenta = obtenerCuentaDeUsuario(ses.id);
     if (!cuenta) return showToast("No tienes cuenta asignada");
     const res = registrarTransaccion({ usuarioId: ses.id, cuentaId: cuenta.id, tipo: "Retiro", monto, nota: "Retiro web" });
     if (!res.ok) return showToast(res.msg || "Error en transacción");
     showToast("Retiro realizado ✔");
     renderPanelUsuario();
     if (window.location.pathname.includes("panel_admin")) {
       renderCuentas(); renderTransaccionesAdmin();
     }
   }
   
   /* -----------------------
      Admin: ver movimientos de usuario concreto (modal simple)
      ----------------------- */
   function adminVerMovimientos(usuarioId) {
     const db = getDB();
     const user = db.usuarios.find(u => u.id === usuarioId);
     if (!user) return alert("Usuario no encontrado");
   
     const txs = db.transacciones.filter(t => t.usuarioId === usuarioId).sort((a,b) => new Date(b.fecha) - new Date(a.fecha));
     let html = `Movimientos de <b>${user.nombre}</b>:\n\n`;
     if (txs.length === 0) html += "No hay movimientos.";
     else txs.forEach(t => html += `${t.fecha} — ${t.tipo} — ${t.monto.toFixed(2)} Bs — ${t.nota || ""}\n`);
   
     alert(html);
   }
   
   /* -----------------------
      PANEL USUARIO - Secciones y render extendido
      ----------------------- */
   // showSection para el panel de usuario (llamado desde el sidebar)
   function showSection(name) {
     // para compatibilidad con admin mostrarSeccion, no interferimos si existe
     document.querySelectorAll(".section").forEach(s => s.classList.remove("active"));
     const target = document.getElementById(name);
     if (target) target.classList.add("active");
   
     // acciónes al mostrar sección
     if (name === "home") renderUserHome();
     if (name === "history") renderUserHistory();
     if (name === "deposit") { /* nada extra */ }
     if (name === "withdraw") { /* nada extra */ }
   }
   
   function renderUserHome() {
     const ses = getSesion();
     if (!ses) return;
     const db = getDB();
     const user = db.usuarios.find(u => u.id === ses.id);
     if (!user) return;
     const cuenta = obtenerCuentaDeUsuario(user.id);
     const elCuenta = document.getElementById("userHomeCuenta") || document.getElementById("userAccount") || document.getElementById("cuentaUsuario");
     const elSaldo = document.getElementById("userHomeSaldo") || document.getElementById("userBalance") || document.getElementById("saldoActual");
     const elNombre = document.getElementById("userName") || document.getElementById("usuarioNombre");
     if (elNombre) elNombre.innerText = user.nombre;
     if (elCuenta) elCuenta.innerText = cuenta ? cuenta.numero : "Sin cuenta";
     if (elSaldo) elSaldo.innerText = cuenta ? cuenta.saldo.toFixed(2) + " Bs" : "0 Bs";
   }
   
   function renderUserHistory() {
     const ses = getSesion();
     if (!ses) return;
     const db = getDB();
     const lista = document.getElementById("userHistoryList") || document.getElementById("movimientosUsuario") || document.getElementById("listaTransacciones");
     if (!lista) return;
     const txs = db.transacciones.filter(t => t.usuarioId === ses.id).sort((a,b) => new Date(b.fecha) - new Date(a.fecha));
     if (lista.tagName && lista.tagName.toLowerCase() === "ul") {
       lista.innerHTML = txs.length === 0 ? "<li>No tienes movimientos.</li>" :
         txs.map(t => `<li><b>${t.tipo}</b> — ${t.monto.toFixed(2)} Bs<br><small>${t.fecha}</small></li>`).join("");
     } else {
       lista.innerHTML = txs.length === 0 ? "<p>No tienes movimientos.</p>" :
         txs.map(t => `<div class="card"><p><b>${t.tipo}</b> ${t.monto.toFixed(2)} Bs<br><small>${t.fecha}</small></p></div>`).join("");
     }
   }
   
   /* -----------------------
      Inicialización al cargar páginas
      ----------------------- */
   document.addEventListener("DOMContentLoaded", () => {
     // Si estamos en login.html, enlazar botón de login al form si existe
     const btnLogin = document.querySelector("button[data-js='login-btn']") || document.querySelector("button[onclick='login()']");
     const inputUser = document.getElementById("usuario");
     const inputPass = document.getElementById("password");
     if (btnLogin && inputUser && inputPass) {
       btnLogin.onclick = login;
     }
   
     // Si estamos en panel_admin.html, mostrar seccion por defecto
     if (window.location.pathname.includes("panel_admin.html")) {
       mostrarSeccion("seccionCuentas");
     }
   
     // Si estamos en panel_usuario.html, renderizar datos del usuario y sección home por defecto
     if (window.location.pathname.includes("panel_usuario.html")) {
       renderPanelUsuario();
       // mostrar home si existe
       if (document.getElementById("home")) showSection("home");
       renderUserHome();
       renderUserHistory();
     }
   
     // Si estamos en chequera.html y existe la chequera, mostrar o mensaje
     if (window.location.pathname.includes("chequera.html")) {
       const ses = getSesion();
       if (!ses) { window.location.href = "login.html"; return; }
       const db = getDB();
       const user = db.usuarios.find(u => u.id === ses.id);
       if (!user || !user.chequeraHabilitada) {
         document.body.innerHTML = "<main style='padding:40px;'><h2>Chequera no habilitada</h2><p>Contacta con el administrador.</p></main>";
         return;
       }
     }
   
     // Escuchar cambios en localStorage desde otras pestañas
     window.addEventListener("storage", (e) => {
       if (e.key === LS_KEY_DB) {
         if (window.location.pathname.includes("panel_admin.html")) {
           renderCuentas(); renderClientes(); renderTransaccionesAdmin();
         }
         if (window.location.pathname.includes("panel_usuario.html")) {
           renderPanelUsuario(); renderUserHome(); renderUserHistory();
         }
       }
     });
   });
   
   /* -----------------------
      Exponer funciones globalmente (para usar desde html onclick)
      ----------------------- */
   window.login = login;
   window.logout = logout;
   window.mostrarSeccion = mostrarSeccion;
   
   window.adminHabilitarChequera = adminHabilitarChequera;
   window.adminDeshabilitarChequera = adminDeshabilitarChequera;
   window.adminVerMovimientos = adminVerMovimientos;
   
   window.crearUsuario = crearUsuario;
   window.crearCuentaParaUsuario = crearCuentaParaUsuario;
   
   window.usuarioDepositar = usuarioDepositar;
   window.usuarioRetirar = usuarioRetirar;
   
   window.registrarTransaccion = registrarTransaccion;
   
   window.showSection = showSection;
   window.renderUserHome = renderUserHome;
   window.renderUserHistory = renderUserHistory;
   
   /* =========================
   Funciones adicionales Panel Usuario
   ========================= */

// Mostrar alert con movimientos del usuario
function usuarioVerMovimientos() {
    const ses = getSesion();
    if (!ses) return alert("No has iniciado sesión");
    const db = getDB();
    const user = db.usuarios.find(u => u.id === ses.id);
    if (!user) return alert("Usuario no encontrado");

    const txs = db.transacciones.filter(t => t.usuarioId === ses.id)
                                .sort((a,b) => new Date(b.fecha) - new Date(a.fecha));
    let msg = `Movimientos de ${user.nombre}:\n\n`;
    if(txs.length === 0) msg += "No tienes movimientos.";
    else txs.forEach(t => msg += `${t.fecha} — ${t.tipo} — ${t.monto.toFixed(2)} Bs — ${t.nota || ""}\n`);

    alert(msg);
}

// Habilitar chequera (solo si el admin permite)
function usuarioHabilitarChequera() {
    const ses = getSesion();
    if(!ses) return alert("No has iniciado sesión");
    const db = getDB();
    const user = db.usuarios.find(u => u.id === ses.id);
    if(!user) return alert("Usuario no encontrado");

    if(user.chequeraHabilitada) return alert("Tu chequera ya está habilitada.");
    alert("Debes solicitar al administrador para habilitar la chequera.");
}

// Deshabilitar chequera (solo si el admin permite)
function usuarioDeshabilitarChequera() {
    const ses = getSesion();
    if(!ses) return alert("No has iniciado sesión");
    const db = getDB();
    const user = db.usuarios.find(u => u.id === ses.id);
    if(!user) return alert("Usuario no encontrado");

    if(!user.chequeraHabilitada) return alert("Tu chequera ya está deshabilitada.");
    alert("Debes solicitar al administrador para deshabilitar la chequera.");
}

// Solicitar nueva cuenta (simula envío de solicitud)
function usuarioSolicitarCuenta(saldoInicial = 0) {
    const ses = getSesion();
    if(!ses) return alert("No has iniciado sesión");
    const db = getDB();
    const user = db.usuarios.find(u => u.id === ses.id);
    if(!user) return alert("Usuario no encontrado");

    const existing = db.cuentas.find(c => c.usuarioId === ses.id);
    if(existing) return alert("Ya tienes una cuenta asignada.");

    const nuevaCuenta = crearCuentaParaUsuario(user.id, null, saldoInicial);
    if(nuevaCuenta.ok) alert(`¡Cuenta creada! Nº: ${nuevaCuenta.cuenta.numero} Saldo inicial: ${nuevaCuenta.cuenta.saldo} Bs`);
    else alert("Error al crear la cuenta: " + nuevaCuenta.msg);
}

// Transferencia entre cuentas propias (si tuviera varias cuentas)
function usuarioTransferir(monto, cuentaDestinoId) {
    const ses = getSesion();
    if(!ses) return alert("No has iniciado sesión");
    const db = getDB();
    const cuentaOrigen = obtenerCuentaDeUsuario(ses.id);
    if(!cuentaOrigen) return alert("No tienes cuenta origen");

    const cuentaDestino = db.cuentas.find(c => c.id === cuentaDestinoId && c.usuarioId === ses.id);
    if(!cuentaDestino) return alert("Cuenta destino no válida");
    monto = Number(monto);
    if(isNaN(monto) || monto <= 0) return alert("Monto inválido");
    if(cuentaOrigen.saldo < monto) return alert("Saldo insuficiente");

    // Aplicar la transferencia
    cuentaOrigen.saldo -= monto;
    cuentaDestino.saldo += monto;

    // Registrar transacciones
    registrarTransaccion({ usuarioId: ses.id, cuentaId: cuentaOrigen.id, tipo: "Transferencia Salida", monto, nota: `A cuenta ${cuentaDestino.numero}` });
    registrarTransaccion({ usuarioId: ses.id, cuentaId: cuentaDestino.id, tipo: "Transferencia Entrada", monto, nota: `De cuenta ${cuentaOrigen.numero}` });

    alert("Transferencia realizada ✔");
    renderPanelUsuario();
}



// Exponer funciones globales para HTML onclick
window.usuarioVerMovimientos = usuarioVerMovimientos;
window.usuarioHabilitarChequera = usuarioHabilitarChequera;
window.usuarioDeshabilitarChequera = usuarioDeshabilitarChequera;
window.usuarioSolicitarCuenta = usuarioSolicitarCuenta;
window.usuarioTransferir = usuarioTransferir;

function showToast(message, tipo = "success", duracion = 3000) {
    const container = document.getElementById("toastContainer");
    if (!container) return;

    const toast = document.createElement("div");
    toast.innerText = message;
    toast.style.padding = "10px 20px";
    toast.style.borderRadius = "8px";
    toast.style.color = "#fff";
    toast.style.fontWeight = "bold";
    toast.style.boxShadow = "0 2px 8px rgba(0,0,0,0.3)";
    toast.style.opacity = "0";
    toast.style.transform = "translateY(-20px)";
    toast.style.transition = "all 0.3s ease";

    if (tipo === "success") toast.style.backgroundColor = "#4BB543";
    else if (tipo === "error") toast.style.backgroundColor = "#FF4C4C";
    else toast.style.backgroundColor = "#333";

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = "1";
        toast.style.transform = "translateY(0)";
    }, 50);

    setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transform = "translateY(-20px)";
        setTimeout(() => toast.remove(), 300);
    }, duracion);
}
