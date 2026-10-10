export const ECP_PILOT_HTML = String.raw`<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>ECP · Revisión de expedientes</title>
<style>
:root{color-scheme:light;--ink:#172033;--muted:#5d687c;--line:#d9dfeb;--paper:#f5f7fb;--accent:#174a83;--warn:#8b4b00}
*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font:16px/1.5 system-ui,-apple-system,Segoe UI,sans-serif}
main{max-width:980px;margin:0 auto;padding:28px 18px 60px}.top{background:#102b4b;color:white;border-radius:18px;padding:26px;margin-bottom:22px}
h1{margin:0 0 8px;font-size:clamp(1.6rem,4vw,2.2rem)}h2{font-size:1.15rem;margin:0 0 14px}.top p{margin:0;color:#dbe7f5}
.panel{background:white;border:1px solid var(--line);border-radius:14px;padding:22px;margin:16px 0;box-shadow:0 3px 12px #12233b08}
.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.field{display:flex;flex-direction:column;gap:6px}.wide{grid-column:1/-1}
label{font-weight:650;font-size:.92rem}input,select,textarea{width:100%;font:inherit;border:1px solid #b9c4d6;border-radius:8px;padding:10px;background:white;color:var(--ink)}
input:focus,select:focus{outline:3px solid #b9d7f4;border-color:var(--accent)}
.small{font-size:.88rem;color:var(--muted)}.file-row{display:grid;grid-template-columns:minmax(0,1fr) 160px minmax(150px,1fr);gap:10px;align-items:center;padding:12px 0;border-bottom:1px solid var(--line)}.file-name{overflow-wrap:anywhere;font-size:.92rem}
button{border:0;border-radius:9px;padding:11px 16px;font:inherit;font-weight:700;cursor:pointer;background:var(--accent);color:white}button.secondary{background:#e8eef6;color:#173453}button:disabled{opacity:.55;cursor:wait}
.actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:16px}.status{padding:12px;border-radius:8px;background:#edf3fa;white-space:pre-wrap;overflow-wrap:anywhere}.status.error{background:#fff0e8;color:#7a2f00}.status.good{background:#e9f7ed;color:#14552c}pre{white-space:pre-wrap;overflow-wrap:anywhere;font: .9rem/1.5 ui-monospace,monospace}
@media(max-width:650px){.grid{grid-template-columns:1fr}.wide{grid-column:auto}.file-row{grid-template-columns:1fr}.top,.panel{padding:18px}}
</style>
</head>
<body>
<main>
<header class="top"><h1>ECP · Expedientes de contratación pública</h1><p>Recepción trazable de documentos y comprobación de habilitación para revisión. No sustituye el análisis jurídico ni emite una recomendación de adjudicación.</p></header>
<section class="panel"><h2>1. Datos del procedimiento</h2>
<div class="grid">
<div class="field"><label for="code">Código del procedimiento *</label><input id="code" required maxlength="160" autocomplete="off"></div>
<div class="field"><label for="entity">Entidad contratante *</label><input id="entity" required maxlength="300"></div>
<div class="field wide"><label for="object">Objeto de contratación *</label><textarea id="object" required maxlength="3000" rows="2"></textarea></div>
<div class="field wide"><label for="source">URL oficial del procedimiento (si existe)</label><input id="source" type="url" placeholder="https://..."></div>
</div></section>
<section class="panel"><h2>2. Cargar originales</h2><p class="small">Selecciona documentos del procedimiento y ofertas. Para cada oferta identifica al oferente tal como aparece en el expediente. No se infiere identidad desde el nombre del archivo.</p>
<div class="field"><label for="files">Archivos PDF o Excel *</label><input id="files" type="file" multiple accept=".pdf,.xlsx,.xls,.csv,.txt,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv,text/plain"></div>
<div id="fileRows" aria-live="polite"></div>
<div class="actions"><button id="submit" type="button">Procesar recepción</button></div>
</section>
<section class="panel"><h2>3. Resultado de recepción</h2><div id="status" class="status" role="status" aria-live="polite">Consultando estado del servicio…</div><div id="result"></div><div class="actions"><button id="gate" class="secondary" type="button" disabled>Comprobar habilitación normativa</button></div></section>
<p class="small">Los archivos se envían al servicio protegido. No cargues credenciales ni información ajena al procedimiento. Si la habilitación institucional está bloqueada, la app lo indicará y no continuará a análisis.</p>
</main>
<script>
(function(){
"use strict";
var filesInput=document.getElementById("files"), rows=document.getElementById("fileRows"), statusBox=document.getElementById("status"), resultBox=document.getElementById("result"), submit=document.getElementById("submit"), gate=document.getElementById("gate"), selected=[], currentId="";
function setStatus(message,kind){statusBox.className="status"+(kind?" "+kind:"");statusBox.textContent=message;}
function el(tag,cls,text){var node=document.createElement(tag);if(cls)node.className=cls;if(text!==undefined)node.textContent=text;return node;}
function b64(file){return file.arrayBuffer().then(function(buffer){var bytes=new Uint8Array(buffer),binary="",step=32768;for(var i=0;i<bytes.length;i+=step)binary+=String.fromCharCode.apply(null,bytes.subarray(i,Math.min(i+step,bytes.length)));return btoa(binary);});}
filesInput.addEventListener("change",function(){selected=Array.from(filesInput.files||[]);rows.replaceChildren();selected.forEach(function(file,index){var row=el("div","file-row"),name=el("div","file-name",file.name+" · "+Math.ceil(file.size/1024)+" KB"),role=el("select"),offeror=el("input");role.setAttribute("aria-label","Tipo de documento para "+file.name);[["","Seleccione tipo"],["PROCEDURE","Documento del procedimiento"],["OFFER","Oferta"]].forEach(function(pair){var option=el("option","",pair[1]);option.value=pair[0];role.appendChild(option);});offeror.placeholder="Nombre del oferente (si es oferta)";offeror.setAttribute("aria-label","Oferente de "+file.name);offeror.disabled=true;role.addEventListener("change",function(){offeror.disabled=role.value!=="OFFER";if(offeror.disabled)offeror.value="";});row.append(name,role,offeror);rows.appendChild(row);selected[index]._ecpRole=role;selected[index]._ecpOfferor=offeror;});});
document.getElementById("source").addEventListener("input",function(){this.setCustomValidity("");});
submit.addEventListener("click",async function(){
var code=document.getElementById("code").value.trim(),entity=document.getElementById("entity").value.trim(),object=document.getElementById("object").value.trim(),source=document.getElementById("source").value.trim();
if(!code||!entity||!object){setStatus("Completa código, entidad y objeto del procedimiento.","error");return;}
if(!selected.length){setStatus("Selecciona al menos un documento original.","error");return;}
if(selected.some(function(f){return !f._ecpRole.value;})){setStatus("Selecciona el tipo de cada documento.","error");return;}
if(selected.some(function(f){return f._ecpRole.value==="OFFER"&&!f._ecpOfferor.value.trim();})){setStatus("Identifica al oferente de cada oferta.","error");return;}
if(!selected.some(function(f){return f._ecpRole.value==="PROCEDURE";})||!selected.some(function(f){return f._ecpRole.value==="OFFER";})){setStatus("Para habilitar la revisión deben existir al menos un documento del procedimiento y una oferta identificada.","error");return;}
submit.disabled=true;gate.disabled=true;resultBox.replaceChildren();setStatus("Leyendo y procesando documentos. No cierres esta ventana…","");
try{
var docs=await Promise.all(selected.map(async function(file){return {documentId:crypto.randomUUID(),title:file.name,mediaType:file.type||"application/octet-stream",sourceUri:"uploaded://local-expedient/"+encodeURIComponent(file.name),role:file._ecpRole.value,offeror:file._ecpRole.value==="OFFER"?file._ecpOfferor.value.trim():undefined,contentBase64:await b64(file)};}));
var response=await fetch("/ecp/v1/expedients",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({metadata:{procedureCode:code,contractingEntity:entity,objectDescription:object,sourceUrl:source||undefined},documents:docs})});
var data=await response.json();if(!response.ok)throw new Error(data.error||"No se pudo procesar el expediente (HTTP "+response.status+").");
currentId=data.expedientId;gate.disabled=false;setStatus("Recepción completada. ID: "+currentId,data.intake.readiness==="READY_FOR_EVIDENCE_REVIEW"?"good":"");var pre=el("pre","",JSON.stringify(data.intake,null,2));resultBox.replaceChildren(pre);
}catch(error){setStatus(error instanceof Error?error.message:"Error inesperado al procesar el expediente.","error");}finally{submit.disabled=false;}
});
gate.addEventListener("click",async function(){if(!currentId)return;gate.disabled=true;setStatus("Consultando la fuente institucional autorizada…","");try{var response=await fetch("/ecp/v1/expedients/"+encodeURIComponent(currentId)+"/analysis-readiness",{method:"POST"});var data=await response.json();if(!response.ok){setStatus("Revisión detenida: "+(data.error||"la fuente institucional no habilitó el análisis")+".","error");resultBox.replaceChildren(el("pre","",JSON.stringify(data,null,2)));return;}setStatus("Contexto institucional disponible para la siguiente etapa controlada.","good");resultBox.replaceChildren(el("pre","",JSON.stringify(data,null,2)));}catch(error){setStatus(error instanceof Error?error.message:"Error al consultar el contexto institucional.","error");}finally{gate.disabled=false;}});
fetch("/health").then(function(r){return r.json().then(function(d){return {ok:r.ok,data:d};});}).then(function(result){if(!result.ok)setStatus("Servicio bloqueado por configuración. Pendientes: "+(result.data.missing||[]).join(", ")+".","error");else setStatus("Servicio disponible. Inicia cargando los datos del procedimiento.","good");}).catch(function(){setStatus("No se pudo consultar el estado del servicio.","error");});
})();
</script>
</body>
</html>`;
