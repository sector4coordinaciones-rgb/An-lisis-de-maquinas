/* =========================================================
   CONFIGURACIÓN
========================================================= */

/*
  REEMPLAZA ESTA URL por la URL /exec de tu Apps Script.

  Ejemplo:

  const API_URL =
    'https://script.google.com/macros/s/XXXXXXXXXXXX/exec';
*/

const API_URL =
  'PEGA_AQUI_TU_URL_DE_APPS_SCRIPT';


/* =========================================================
   ESTADO GLOBAL
========================================================= */

let DATA = [];

let filteredData = [];

let charts = {};

let searchTimer = null;


/* =========================================================
   COLUMNAS
========================================================= */

const COL = {

  MARCA: 0,
  NRO: 1,
  MAQUINA: 2,
  JUEGO: 3,

  COIN: 4,
  COIN_PROM: 5,

  VENTA: 6,
  VENTA_PROM: 7,

  PAGO: 8,

  LOCAL: 9,
  MES: 10,
  ANO: 11,

  TIPO: 12,

  TC: 13

};


/* =========================================================
   INICIO
========================================================= */

document.addEventListener(
  'DOMContentLoaded',
  iniciar
);


async function iniciar() {

  configurarEventos();

  mostrarMensaje(
    'Cargando datos...',
    false
  );

  await cargarDatos(false);

}


/* =========================================================
   EVENTOS
========================================================= */

function configurarEventos() {


  document
    .getElementById('filtroLocal')
    .addEventListener(
      'change',
      cambioLocal
    );


  document
    .getElementById('filtroTipo')
    .addEventListener(
      'change',
      cambioTipo
    );


  document
    .getElementById('filtroJuego')
    .addEventListener(
      'change',
      cambioJuego
    );


  document
    .getElementById('filtroMaquina')
    .addEventListener(
      'change',
      aplicarFiltros
    );


  document
    .getElementById('buscador')
    .addEventListener(
      'input',
      function() {

        clearTimeout(searchTimer);

        searchTimer = setTimeout(
          aplicarFiltros,
          1000
        );

      }
    );


  document
    .getElementById('btnLimpiar')
    .addEventListener(
      'click',
      limpiarFiltros
    );


  document
    .getElementById('btnActualizar')
    .addEventListener(
      'click',
      function() {

        cargarDatos(true);

      }
    );


  document
    .getElementById('mesRankingLocal')
    .addEventListener(
      'change',
      actualizarRankingsLocal
    );


  document
    .getElementById('indicadorDetalle')
    .addEventListener(
      'change',
      actualizarRankingDetalle
    );


  document
    .getElementById('mesRankingDetalle')
    .addEventListener(
      'change',
      actualizarRankingDetalle
    );

}


/* =========================================================
   CARGA DE DATOS
========================================================= */

async function cargarDatos(actualizar) {

  const btn =
    document.getElementById(
      'btnActualizar'
    );

  btn.disabled = true;

  mostrarMensaje(
    actualizar
      ? 'Actualizando datos...'
      : 'Cargando datos...',
    false
  );


  try {

    const url =
      API_URL +
      '?api=dashboard' +
      '&callback=dashboardCallback';


    const resultado =
      await cargarJSONP(url);


    if (!resultado || !resultado.ok) {

      DATA = [];

      filteredData = [];

      actualizarEstado(
        false,
        null
      );

      mostrarMensaje(
        'No existe una copia central de datos. Presiona "Actualizar datos" en el dashboard de Apps Script para generar la copia.',
        true
      );

      return;
    }


    DATA = Array.isArray(
      resultado.rows
    )
      ? resultado.rows
      : [];


    filteredData =
      DATA.slice();


    actualizarEstado(
      true,
      resultado.actualizado
    );


    inicializarFiltros();

    actualizarFiltrosVisuales();

    actualizarTodo();


    ocultarMensaje();


  } catch (error) {

    console.error(error);

    actualizarEstado(
      false,
      null
    );

    mostrarMensaje(
      'No se pudieron cargar los datos. Verifica la URL del Apps Script y que la implementación esté publicada como aplicación web.',
      true
    );

  } finally {

    btn.disabled = false;

  }

}


/* =========================================================
   JSONP
========================================================= */

function cargarJSONP(url) {

  return new Promise(
    function(resolve, reject) {

      const callbackName =
        'dashboardCallback_' +
        Date.now();


      const script =
        document.createElement(
          'script'
        );


      const timeout =
        setTimeout(
          function() {

            cleanup();

            reject(
              new Error(
                'Tiempo de espera agotado.'
              )
            );

          },
          30000
        );


      function cleanup() {

        clearTimeout(timeout);

        if (script.parentNode) {
          script.parentNode.removeChild(
            script
          );
        }

        try {
          delete window[callbackName];
        } catch (e) {
          window[callbackName] =
            undefined;
        }

      }


      window[callbackName] =
        function(data) {

          cleanup();

          resolve(data);

        };


      script.onerror =
        function() {

          cleanup();

          reject(
            new Error(
              'No fue posible acceder al API.'
            )
          );

        };


      script.src =
        url.replace(
          'dashboardCallback',
          callbackName
        );


      document
        .head
        .appendChild(script);

    }
  );

}


/* =========================================================
   FILTROS INICIALES
========================================================= */

function inicializarFiltros() {

  const local =
    document.getElementById(
      'filtroLocal'
    );

  const tipo =
    document.getElementById(
      'filtroTipo'
    );

  const juego =
    document.getElementById(
      'filtroJuego'
    );

  const maquina =
    document.getElementById(
      'filtroMaquina'
    );


  local.innerHTML =
    '<option value="">Todos</option>';

  tipo.innerHTML =
    '<option value="">Todos</option>';

  juego.innerHTML =
    '<option value="">Todos</option>';

  maquina.innerHTML =
    '<option value="">Todos</option>';


  agregarOpciones(
    local,
    valoresUnicos(
      DATA,
      COL.LOCAL
    )
  );


  agregarOpciones(
    tipo,
    valoresUnicos(
      DATA,
      COL.TIPO
    )
  );


  agregarOpciones(
    juego,
    valoresUnicos(
      DATA,
      COL.JUEGO
    )
  );


  agregarOpciones(
    maquina,
    valoresUnicos(
      DATA,
      COL.MAQUINA
    )
  );


  inicializarMeses();

}


/* =========================================================
   CASCADA LOCAL
========================================================= */

function cambioLocal() {

  const local =
    valor('filtroLocal');


  const tipo =
    document.getElementById(
      'filtroTipo'
    );


  const juego =
    document.getElementById(
      'filtroJuego'
    );


  const maquina =
    document.getElementById(
      'filtroMaquina'
    );


  const base =
    local
      ? DATA.filter(
          row =>
            texto(row[COL.LOCAL]) === local
        )
      : DATA;


  tipo.innerHTML =
    '<option value="">Todos</option>';


  agregarOpciones(
    tipo,
    valoresUnicos(
      base,
      COL.TIPO
    )
  );


  juego.innerHTML =
    '<option value="">Todos</option>';


  agregarOpciones(
    juego,
    valoresUnicos(
      base,
      COL.JUEGO
    )
  );


  maquina.innerHTML =
    '<option value="">Todos</option>';


  agregarOpciones(
    maquina,
    valoresUnicos(
      base,
      COL.MAQUINA
    )
  );


  aplicarFiltros();

}


/* =========================================================
   CASCADA TIPO
========================================================= */

function cambioTipo() {

  const local =
    valor('filtroLocal');

  const tipo =
    valor('filtroTipo');


  let base = DATA;


  if (local) {

    base =
      base.filter(
        row =>
          texto(row[COL.LOCAL]) === local
      );

  }


  if (tipo) {

    base =
      base.filter(
        row =>
          texto(row[COL.TIPO]) === tipo
      );

  }


  const juego =
    document.getElementById(
      'filtroJuego'
    );

  const maquina =
    document.getElementById(
      'filtroMaquina'
    );


  juego.innerHTML =
    '<option value="">Todos</option>';

  agregarOpciones(
    juego,
    valoresUnicos(
      base,
      COL.JUEGO
    )
  );


  maquina.innerHTML =
    '<option value="">Todos</option>';

  agregarOpciones(
    maquina,
    valoresUnicos(
      base,
      COL.MAQUINA
    )
  );


  aplicarFiltros();

}


/* =========================================================
   CASCADA JUEGO
========================================================= */

function cambioJuego() {

  const local =
    valor('filtroLocal');

  const tipo =
    valor('filtroTipo');

  const juego =
    valor('filtroJuego');


  let base = DATA;


  if (local) {

    base =
      base.filter(
        row =>
          texto(row[COL.LOCAL]) === local
      );

  }


  if (tipo) {

    base =
      base.filter(
        row =>
          texto(row[COL.TIPO]) === tipo
      );

  }


  if (juego) {

    base =
      base.filter(
        row =>
          texto(row[COL.JUEGO]) === juego
      );

  }


  const maquina =
    document.getElementById(
      'filtroMaquina'
    );


  maquina.innerHTML =
    '<option value="">Todos</option>';


  agregarOpciones(
    maquina,
    valoresUnicos(
      base,
      COL.MAQUINA
    )
  );


  aplicarFiltros();

}


/* =========================================================
   APLICAR FILTROS
========================================================= */

function aplicarFiltros() {

  const local =
    valor('filtroLocal');

  const tipo =
    valor('filtroTipo');

  const juego =
    valor('filtroJuego');

  const maquina =
    valor('filtroMaquina');

  const search =
    texto(
      document.getElementById(
        'buscador'
      ).value
    ).toLowerCase();


  filteredData =
    DATA.filter(
      function(row) {


        if (
          local &&
          texto(row[COL.LOCAL]) !== local
        ) {
          return false;
        }


        if (
          tipo &&
          texto(row[COL.TIPO]) !== tipo
        ) {
          return false;
        }


        if (
          juego &&
          texto(row[COL.JUEGO]) !== juego
        ) {
          return false;
        }


        if (
          maquina &&
          texto(row[COL.MAQUINA]) !== maquina
        ) {
          return false;
        }


        if (search) {

          const encontrado =
            row.some(
              function(value) {

                return texto(value)
                  .toLowerCase()
                  .includes(search);

              }
            );


          if (!encontrado) {
            return false;
          }

        }


        return true;

      }
    );


  actualizarFiltrosVisuales();

  actualizarTodo();

}


/* =========================================================
   ACTUALIZAR TODO
========================================================= */

function actualizarTodo() {

  crearGraficosMensuales();

  actualizarMesesRanking();

  actualizarRankingsLocal();

  actualizarRankingDetalle();

}


/* =========================================================
   GRÁFICOS MENSUALES
========================================================= */

function crearGraficosMensuales() {

  const meses =
    ordenarMeses(
      valoresUnicos(
        filteredData,
        COL.MES
      )
    );


  crearGraficoLinea(
    'chartCoin',
    'INDICADOR COIN PROM',
    meses,
    promediosPorMes(
      filteredData,
      COL.COIN_PROM,
      meses
    ),
    '#2e7d32'
  );


  crearGraficoLinea(
    'chartVenta',
    'INDICADOR VENTA PROM',
    meses,
    promediosPorMes(
      filteredData,
      COL.VENTA_PROM,
      meses
    ),
    '#f57c00'
  );


  crearGraficoLinea(
    'chartTC',
    'INDICADOR T.C',
    meses,
    promediosPorMes(
      filteredData,
      COL.TC,
      meses
    ),
    '#c62828'
  );

}


/* =========================================================
   CREAR LÍNEA
========================================================= */

function crearGraficoLinea(
  canvasId,
  label,
  labels,
  values,
  color
) {

  destruirChart(canvasId);


  const canvas =
    document.getElementById(
      canvasId
    );


  charts[canvasId] =
    new Chart(
      canvas,
      {

        type: 'line',

        data: {

          labels: labels,

          datasets: [

            {

              label: label,

              data: values,

              borderColor: color,

              backgroundColor: color,

              borderWidth: 2,

              pointRadius: 3,

              pointHoverRadius: 5,

              tension: .25,

              fill: false

            }

          ]

        },


        options: {

          responsive: true,

          maintainAspectRatio: false,

          animation: false,

          interaction: {

            intersect: false,

            mode: 'index'

          },


          plugins: {

            legend: {

              display: false

            },

            tooltip: {

              callbacks: {

                label:
                  function(context) {

                    return (
                      context.dataset.label +
                      ': ' +
                      formatearNumero(
                        context.parsed.y
                      )
                    );

                  }

              }

            }

          },


          scales: {

            x: {

              grid: {
                display: false
              }

            },

            y: {

              beginAtZero: false,

              ticks: {

                callback:
                  function(value) {

                    return formatearNumero(
                      value
                    );

                  }

              }

            }

          }

        }

      }
    );

}


/* =========================================================
   MESES RANKING
========================================================= */

function inicializarMeses() {

  const meses =
    ordenarMeses(
      valoresUnicos(
        DATA,
        COL.MES
      )
    );


  const selectLocal =
    document.getElementById(
      'mesRankingLocal'
    );

  const selectDetalle =
    document.getElementById(
      'mesRankingDetalle'
    );


  llenarSelectMes(
    selectLocal,
    meses
  );


  llenarSelectMes(
    selectDetalle,
    meses
  );

}


function actualizarMesesRanking() {

  const meses =
    ordenarMeses(
      valoresUnicos(
        filteredData,
        COL.MES
      )
    );


  llenarSelectMes(
    document.getElementById(
      'mesRankingLocal'
    ),
    meses,
    true
  );


  llenarSelectMes(
    document.getElementById(
      'mesRankingDetalle'
    ),
    meses,
    true
  );

}


function llenarSelectMes(
  select,
  meses,
  conservar = false
) {

  const anterior =
    conservar
      ? select.value
      : '';


  select.innerHTML =
    '<option value="">Todos</option>';


  agregarOpciones(
    select,
    meses
  );


  if (
    anterior &&
    meses.includes(anterior)
  ) {

    select.value =
      anterior;

  }

}


/* =========================================================
   RANKINGS LOCALES
========================================================= */

function actualizarRankingsLocal() {

  const mes =
    valor('mesRankingLocal');


  const base =
    mes
      ? filteredData.filter(
          row =>
            texto(row[COL.MES]) === mes
        )
      : filteredData;


  const rankingCoin =
    construirRanking(
      base,
      COL.LOCAL,
      COL.COIN_PROM
    );


  const rankingVenta =
    construirRanking(
      base,
      COL.LOCAL,
      COL.VENTA_PROM
    );


  const rankingTC =
    construirRanking(
      base,
      COL.LOCAL,
      COL.TC
    );


  crearRanking(
    'rankingLocalCoin',
    'wrapperRankingLocalCoin',
    rankingCoin,
    'COIN PROM'
  );


  crearRanking(
    'rankingLocalVenta',
    'wrapperRankingLocalVenta',
    rankingVenta,
    'VENTA PROM'
  );


  crearRanking(
    'rankingLocalTC',
    'wrapperRankingLocalTC',
    rankingTC,
    'T.C'
  );

}


/* =========================================================
   RANKING DETALLADO
========================================================= */

function actualizarRankingDetalle() {

  const local =
    valor('filtroLocal');


  const section =
    document.getElementById(
      'detalleSection'
    );


  if (!local) {

    section.classList.add(
      'hidden'
    );

    return;

  }


  section.classList.remove(
    'hidden'
  );


  const indicador =
    valor('indicadorDetalle');


  const mes =
    valor('mesRankingDetalle');


  let base =
    filteredData.filter(
      row =>
        texto(row[COL.LOCAL]) === local
    );


  if (mes) {

    base =
      base.filter(
        row =>
          texto(row[COL.MES]) === mes
      );

  }


  let columna;


  if (indicador === 'venta') {

    columna =
      COL.VENTA_PROM;

  } else if (
    indicador === 'tc'
  ) {

    columna =
      COL.TC;

  } else {

    columna =
      COL.COIN_PROM;

  }


  const rankingTipo =
    construirRanking(
      base,
      COL.TIPO,
      columna
    );


  const rankingJuego =
    construirRanking(
      base,
      COL.JUEGO,
      columna
    );


  const rankingMaquina =
    construirRanking(
      base,
      COL.MAQUINA,
      columna
    );


  crearRanking(
    'rankingTipo',
    'wrapperRankingTipo',
    rankingTipo,
    indicador
  );


  crearRanking(
    'rankingJuego',
    'wrapperRankingJuego',
    rankingJuego,
    indicador
  );


  crearRanking(
    'rankingMaquina',
    'wrapperRankingMaquina',
    rankingMaquina,
    indicador
  );

}


/* =========================================================
   CONSTRUIR RANKING
========================================================= */

function construirRanking(
  rows,
  categoriaCol,
  valorCol
) {

  const grupos =
    new Map();


  rows.forEach(
    function(row) {

      const nombre =
        texto(
          row[categoriaCol]
        );


      const numero =
        convertirNumero(
          row[valorCol]
        );


      if (!nombre || numero === null) {
        return;
      }


      if (!grupos.has(nombre)) {

        grupos.set(
          nombre,
          []
        );

      }


      grupos
        .get(nombre)
        .push(numero);

    }
  );


  const resultado = [];


  grupos.forEach(
    function(values, nombre) {

      if (!values.length) {
        return;
      }


      const suma =
        values.reduce(
          (a, b) => a + b,
          0
        );


      resultado.push({

        label: nombre,

        value:
          suma / values.length

      });

    }
  );


  resultado.sort(
    function(a, b) {

      return b.value - a.value;

    }
  );


  return resultado;

}


/* =========================================================
   CREAR RANKING HORIZONTAL
========================================================= */

function crearRanking(
  canvasId,
  wrapperId,
  ranking,
  indicador
) {

  destruirChart(canvasId);


  const wrapper =
    document.getElementById(
      wrapperId
    );


  const canvas =
    document.getElementById(
      canvasId
    );


  if (!ranking.length) {

    wrapper.style.height =
      '360px';

    return;

  }


  /*
    Altura dinámica.

    Cada elemento necesita aproximadamente
    32 px.

    Si hay muchos elementos aparece scroll
    vertical en el contenedor.
  */

  const altura =
    Math.max(
      360,
      ranking.length * 32
    );


  wrapper.style.height =
    altura + 'px';


  const labels =
    ranking.map(
      item =>
        item.label
    );


  const values =
    ranking.map(
      item =>
        item.value
    );


  const colors =
    generarColoresSemaforo(
      values
    );


  charts[canvasId] =
    new Chart(
      canvas,
      {

        type: 'bar',


        data: {

          labels: labels,

          datasets: [

            {

              label:
                indicador,

              data:
                values,

              backgroundColor:
                colors,

              borderWidth: 0,

              borderRadius: 4,

              barPercentage: .75,

              categoryPercentage: .82

            }

          ]

        },


        options: {

          indexAxis: 'y',

          responsive: true,

          maintainAspectRatio: false,

          animation: false,


          plugins: {

            legend: {

              display: false

            },


            tooltip: {

              callbacks: {

                label:
                  function(context) {

                    return (
                      ' ' +
                      formatearNumero(
                        context.parsed.x
                      )
                    );

                  }

              }

            }

          },


          scales: {

            y: {

              beginAtZero: true,

              grid: {

                display: false

              },

              ticks: {

                autoSkip: false,

                font: {

                  size: 10

                }

              }

            },


            x: {

              beginAtZero: true,

              grid: {

                color:
                  'rgba(0,0,0,.06)'

              },

              ticks: {

                callback:
                  function(value) {

                    return formatearNumero(
                      value
                    );

                  }

              }

            }

          }

        }

      }
    );

}


/* =========================================================
   SEMÁFORO
========================================================= */

function generarColoresSemaforo(
  values
) {

  if (!values.length) {
    return [];
  }


  const min =
    Math.min(...values);

  const max =
    Math.max(...values);


  if (min === max) {

    return values.map(
      () => '#fbc02d'
    );

  }


  return values.map(
    function(value) {

      const ratio =
        (value - min) /
        (max - min);


      /*
        Rojo → amarillo → verde
      */

      if (ratio <= .5) {

        return mezclarColor(
          '#c62828',
          '#fbc02d',
          ratio * 2
        );

      }


      return mezclarColor(
        '#fbc02d',
        '#2e7d32',
        (ratio - .5) * 2
      );

    }
  );

}


function mezclarColor(
  color1,
  color2,
  porcentaje
) {

  const a =
    hexToRgb(color1);

  const b =
    hexToRgb(color2);


  const r =
    Math.round(
      a.r +
      (b.r - a.r) *
      porcentaje
    );


  const g =
    Math.round(
      a.g +
      (b.g - a.g) *
      porcentaje
    );


  const bl =
    Math.round(
      a.b +
      (b.b - a.b) *
      porcentaje
    );


  return (
    'rgb(' +
    r + ',' +
    g + ',' +
    bl +
    ')'
  );

}


function hexToRgb(hex) {

  const value =
    hex.replace('#', '');


  return {

    r:
      parseInt(
        value.substring(0, 2),
        16
      ),

    g:
      parseInt(
        value.substring(2, 4),
        16
      ),

    b:
      parseInt(
        value.substring(4, 6),
        16
      )

  };

}


/* =========================================================
   PROMEDIOS POR MES
========================================================= */

function promediosPorMes(
  rows,
  valueCol,
  meses
) {

  return meses.map(
    function(mes) {

      const values =
        rows
          .filter(
            row =>
              texto(row[COL.MES]) === mes
          )
          .map(
            row =>
              convertirNumero(
                row[valueCol]
              )
          )
          .filter(
            value =>
              value !== null
          );


      if (!values.length) {
        return null;
      }


      return (
        values.reduce(
          (a, b) => a + b,
          0
        ) / values.length
      );

    }
  );

}


/* =========================================================
   OPCIONES
========================================================= */

function agregarOpciones(
  select,
  values
) {

  values.forEach(
    function(value) {

      const option =
        document.createElement(
          'option'
        );


      option.value =
        value;

      option.textContent =
        value;


      select.appendChild(
        option
      );

    }
  );

}


function valoresUnicos(
  rows,
  column
) {

  const set =
    new Set();


  rows.forEach(
    function(row) {

      const value =
        texto(row[column]);


      if (value) {
        set.add(value);
      }

    }
  );


  return Array
    .from(set)
    .sort(
      compararTexto
    );

}


/* =========================================================
   ACTUALIZAR FILTROS VISUALES
========================================================= */

function actualizarFiltrosVisuales() {

  const chips =
    document.getElementById(
      'chips'
    );


  chips.innerHTML = '';


  const filtros = [

    [
      'LOCAL',
      valor('filtroLocal')
    ],

    [
      'TIPO MÁQUINA',
      valor('filtroTipo')
    ],

    [
      'JUEGO',
      valor('filtroJuego')
    ],

    [
      'MÁQUINA',
      valor('filtroMaquina')
    ]

  ];


  filtros.forEach(
    function(item) {

      if (!item[1]) {
        return;
      }


      const chip =
        document.createElement(
          'span'
        );


      chip.className =
        'chip';


      chip.textContent =
        item[0] +
        ': ' +
        item[1];


      chips.appendChild(
        chip
      );

    }
  );


  const cantidad =
    document.createElement(
      'span'
    );


  cantidad.className =
    'chip';


  cantidad.textContent =
    'Registros: ' +
    filteredData.length;


  chips.appendChild(
    cantidad
  );

}


/* =========================================================
   LIMPIAR FILTROS
========================================================= */

function limpiarFiltros() {

  document.getElementById(
    'filtroLocal'
  ).value = '';


  document.getElementById(
    'filtroTipo'
  ).value = '';


  document.getElementById(
    'filtroJuego'
  ).value = '';


  document.getElementById(
    'filtroMaquina'
  ).value = '';


  document.getElementById(
    'buscador'
  ).value = '';


  document.getElementById(
    'mesRankingLocal'
  ).value = '';


  document.getElementById(
    'mesRankingDetalle'
  ).value = '';


  inicializarFiltros();


  filteredData =
    DATA.slice();


  actualizarFiltrosVisuales();

  actualizarTodo();

}


/* =========================================================
   UTILIDADES
========================================================= */

function valor(id) {

  return texto(
    document.getElementById(id).value
  );

}


function texto(value) {

  if (
    value === null ||
    value === undefined
  ) {

    return '';

  }


  return String(value).trim();

}


function convertirNumero(value) {

  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {

    return null;

  }


  if (
    typeof value === 'number'
  ) {

    return Number.isFinite(
      value
    )
      ? value
      : null;

  }


  let text =
    String(value).trim();


  if (!text) {
    return null;
  }


  if (
    text.includes(',') &&
    text.includes('.')
  ) {

    if (
      text.lastIndexOf(',') >
      text.lastIndexOf('.')
    ) {

      text =
        text
          .replace(/\./g, '')
          .replace(',', '.');

    } else {

      text =
        text.replace(/,/g, '');

    }

  } else if (
    text.includes(',')
  ) {

    text =
      text.replace(',', '.');

  }


  text =
    text.replace(
      /[^\d.-]/g,
      ''
    );


  const number =
    Number(text);


  return Number.isFinite(
    number
  )
    ? number
    : null;

}


function formatearNumero(
  value
) {

  if (
    value === null ||
    value === undefined ||
    !Number.isFinite(
      Number(value)
    )
  ) {

    return '—';

  }


  return Number(value)
    .toLocaleString(
      'es-PE',
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }
    );

}


function compararTexto(
  a,
  b
) {

  return a.localeCompare(
    b,
    'es',
    {
      numeric: true,
      sensitivity: 'base'
    }
  );

}


/* =========================================================
   MESES
========================================================= */

function ordenarMeses(
  meses
) {

  const orden = {

    enero: 1,
    febrero: 2,
    marzo: 3,
    abril: 4,
    mayo: 5,
    junio: 6,
    julio: 7,
    agosto: 8,
    septiembre: 9,
    setiembre: 9,
    octubre: 10,
    noviembre: 11,
    diciembre: 12

  };


  return meses.sort(
    function(a, b) {

      const aa =
        orden[
          texto(a).toLowerCase()
        ] || 99;


      const bb =
        orden[
          texto(b).toLowerCase()
        ] || 99;


      if (aa !== bb) {
        return aa - bb;
      }


      return compararTexto(
        a,
        b
      );

    }
  );

}


/* =========================================================
   CHART MANAGEMENT
========================================================= */

function destruirChart(
  canvasId
) {

  if (
    charts[canvasId]
  ) {

    charts[canvasId].destroy();

    delete charts[canvasId];

  }

}


/* =========================================================
   ESTADO
========================================================= */

function actualizarEstado(
  conectado,
  fecha
) {

  const estado =
    document.getElementById(
      'estadoConexion'
    );


  const ultima =
    document.getElementById(
      'ultimaActualizacion'
    );


  if (conectado) {

    estado.textContent =
      'Datos cargados';

    estado.className =
      'status online';


    ultima.textContent =
      fecha
        ? 'Actualizado: ' + fecha
        : '';

  } else {

    estado.textContent =
      'Sin datos';

    estado.className =
      'status offline';

    ultima.textContent =
      '';

  }

}


/* =========================================================
   MENSAJES
========================================================= */

function mostrarMensaje(
  mensaje,
  error
) {

  const elemento =
    document.getElementById(
      'mensaje'
    );


  elemento.textContent =
    mensaje;


  elemento.classList.remove(
    'hidden'
  );


  elemento.classList.toggle(
    'error',
    !!error
  );

}


function ocultarMensaje() {

  document
    .getElementById(
      'mensaje'
    )
    .classList.add(
      'hidden'
    );

}
