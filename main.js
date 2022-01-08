var data_file = [],
  codification = "ISO-8859-1",
  saida = { types: {}, body: [], sizes: {} },
  base_analise_data = 100,
  transform = false,
  fila = [],
  sleep = 0,
  readData = {},
  output = "JSON";

let isDate = function (d) {
    let inp = /(\d{2})\/(\d{2})\/(\d{4})/.exec(d);
    return inp &&
      inp[1] > 0 &&
      inp[1] < 32 &&
      inp[2] > 0 &&
      inp[2] < 13 &&
      inp[3] > 0 &&
      inp[3] < 3000 &&
      inp.map((i) => (Number.isInteger(+i) ? 1 : "")).join("") == "111"
      ? new Date(inp.slice(1).reverse().join("-") + " 00:01")
      : false;
  },
  isDateTime = function (d) {
    let inp = /(\d{2}).(\d{2}).(\d{4}) (\d{2}).(\d{2})/.exec(d);
    console.log(inp);
    return inp &&
      inp[1] > 0 &&
      inp[1] < 32 &&
      inp[2] > 0 &&
      inp[2] < 13 &&
      inp[3] > 0 &&
      inp[3] < 3000 &&
      inp[4] >= 0 &&
      inp[4] < 24 &&
      inp[5] >= 0 &&
      inp[5] <= 60 &&
      inp.map((i) => (Number.isInteger(+i) ? 1 : "")).join("") == "11111"
      ? new Date(
          inp.slice(1, 4).reverse().join("-") + " " + inp.slice(4, 6).join(":")
        )
      : false;
  },
  isFloat = function (n) {
    if (!isNaN(+n) || !isInt(n)) return +n;
  },
  isInt = function (i) {
    return i && i[0] != "0" && Number.isInteger(+i) ? +i : false;
  },
  isBool = function (b) {
    return [0, 1, "true", "false"].includes(b.toLowerCase());
  },
  isString = function (w) {
    // (!isDate(w) && !isFloat(w) && !isInt(w))? w : false;
    return w;
  },
  isSeparation = function (text) {
    return /[^\wáéíóúàèìòùâêîôûãõç '"]+/.exec(text.toLowerCase())[0] || "";
  },
  moreOcorrent = function (arr) {
    return Object.keys(
      arr.reduce(function (acc, e) {
        acc[e] = e in acc ? acc[e] + 1 : 1;
        return acc;
      }, {})
    ).sort(function (a, b) {
      return arr[b] - arr[a];
    })[0];
  },
  checkType = function (obj) {
    var analise = [];
    obj.colunas.map((linha) => {
      let cont = 0,
        size = 0;
      for (c in linha) {
        if (obj.cabecalho.length > cont) {
          let coluna = linha[c];

          if (size < coluna.length) size = coluna.length;
          if (!analise[c]) analise[c] = [];

          saida.sizes[c] = size;

          if (isInt(coluna)) analise[c].push("Int");
          else if (isDateTime(coluna)) analise[c].push("DateTime");
          else if (isDate(coluna)) analise[c].push("Date");
          else if (isFloat(coluna) > -1) analise[c].push("Float");
          else if (isBool(coluna)) analise[c].push("Bool");
          else if (isString(coluna)) analise[c].push("String");
          else analise[c].push("Fail");
        }
        cont++;
      }
    });
    return analise;
  },
  actionAlert = function (text, type) {
    let imgs = [
        "imgs/fail.png",
        "imgs/load.gif",
        "imgs/build.png",
        "imgs/automation.png",
        "imgs/success.png",
        "imgs/down.png",
      ],
      msg = [
        "Falha",
        "Carregando",
        "Trabalhando",
        "Processando",
        "Finalizado",
        "Final",
      ];
    document.title = text;
    $("#output").val(text);
    $("label[for=textarea1]").addClass("active");

    if ([1, 2].includes(type)) $(".telaCarg").show();
    if (
      [
        "Leitura finalizada!",
        "Link Criado",
        "Transformação realizada com sucesso!",
      ].includes(text)
    )
      $(".telaCarg").hide();

    if (
      Notification.permission === "granted" &&
      $("#notification").is(":checked")
    ) {
      var notification = new Notification(msg[type], {
        icon: imgs[type],
        body: text,
      });

      notification.onclick = function () {
        if (type > 4) $(".downFile").click();
      };
    }
  },
  checkData = function (obj) {
    base_analise_data = +$("#analise").val();
    let analise = {},
      linhas = checkType(obj);
    for (c in linhas) {
      analise[c] = moreOcorrent(linhas[c].slice(0, base_analise_data));
    }
    return analise;
  },
  padronize = function (f) {
    let dataBase = readData[f];
    dataBase.body.map((linhas, l) => {
      for (c in linhas) {
        let coluna = linhas[c];
        dataBase.body[l][c] =
          dataBase.types[c] == "String"
            ? isString(coluna)
            : dataBase.types[c] == "DateTime"
            ? isDateTime(coluna)
            : dataBase.types[c] == "Date"
            ? isDate(coluna)
            : dataBase.types[c] == "Float"
            ? isFloat(coluna)
            : dataBase.types[c] == "Int"
            ? isInt(coluna)
            : dataBase.types[c] == "Bool"
            ? eval(coluna)
            : "FAIL_CONVERT_TYPE";
      }
    });
    $(".st_prog").show();
    dropButton("Ver:", f, "show()");
  },
  createButtonDown = function (f) {
    let new_name = f.replace(/([^a-zA-Z0-9])+/g, ""),
      binStr =
        typeOp.value == "JSON"
          ? JSON.stringify(readData[new_name])
          : typeOp.value == "SQL"
          ? outSQL(readData[new_name], "NOT_DEFINED")
          : typeOp.value == "CSV"
          ? outCSV(readData[new_name])
          : "",
      len = binStr.length,
      arr = new Uint8Array(len),
      temp;

    for (var i = 0; i < len; i++) {
      arr[i] = binStr.charCodeAt(i);
    }

    temp = new Blob([arr]);

    return URL.createObjectURL(temp);
  },
  createSelectType = function (s = "Int", c = 0, f) {
    let analise = `<div class="input-field col s12"><select readfile="${f}" class="validate field" camp="${c}">`,
      types = ["Int", "Float", "Date", "String", "Bool"];

    types.map(
      (t) =>
        (analise += `<option value="${t}" ${
          t == s ? "selected" : ""
        }>${t}</option>`)
    );

    analise += `</select><label>Type Column</label></div>`;
    return analise;
  },
  createSelectMask = function (s = "#.##", c = 0, f) {
    let analise = `<div class="input-field col s12"><select readfile="${f}" class="validate mask" camp="${c}">`,
      types = ["#.##", "#.###,00", "DD/MM/YYYY", "YYYY-MM-DD", "@"];

    types.map(
      (t) =>
        (analise += `<option value="${t}" ${
          t == s ? "selected" : ""
        }>${t}</option>`)
    );

    analise += `</select><label>Type Column</label></div>`;
    return analise;
  },
  createConfigData = function () {
    let analise = '<ul id="tabs-swipe-demo" class="tabs">';

    if (Object.values(readData).length < 1) {
      actionAlert("Arquivo não carregado", 0);
      if (infile.value == "") $("#infile").click();
    }

    for (f in readData)
      analise += `<li class="tab col s3"><a href="#${f.replace(
        /([^a-zA-Z0-9])+/g,
        ""
      )}-swipe" class="${
        Object.keys(readData).indexOf(f) < 1 ? "active" : ""
      }">${f}</a></li>`;

    analise += `</ul>`;

    for (f in readData) {
      let fileRead = readData[f],
        c = 0;

      analise += `<div id="${f.replace(
        /([^a-zA-Z0-9])+/g,
        ""
      )}-swipe" class="col s12">
                        <table class="striped">
                        <thead>
                          <tr>
                            <th>Id</th>
                            <th>Name</th>
                            <th>Type</th>
                            <th>Size</th>
                            <th>Mask</th>
                          </tr>
                        </thead>
                        <tbody>`;

      for (linha in fileRead.types) {
        analise += `<tr>
                            <td>${c + 1}</td>
                            <td>
                                <div class="input-field col s6">
                                    <input id="inpName${c}" type="text" class="validate field" camp="${c}" readfile="${f.replace(
          /([^a-zA-Z0-9])+/g,
          ""
        )}" value="${linha}">
                                    <label for="inpName${c}" class="active">Name Column</label>
                                </div>
                            </td>
                            <td>${createSelectType(
                              fileRead.types[linha],
                              c,
                              f.replace(/([^a-zA-Z0-9])+/g, "")
                            )}</td>
                            <td>
                                <div class="input-field col s6">
                                    <input id="inpSize${c}" readfile="${f.replace(
          /([^a-zA-Z0-9])+/g,
          ""
        )}" type="number" class="validate fildSize" camp="${c}" value="${
          fileRead.sizes[linha]
        }">
                                    <label for="inpSize${c}" class="active">Size Column</label>
                                </div>
                            </td>
                            <td>${createSelectMask(
                              fileRead.types[linha],
                              c,
                              f.replace(/([^a-zA-Z0-9])+/g, "")
                            )}</td>
                        </tr>`;
        c++;
      }
      analise += `</tbody></table></div>`;
    }

    $(".locTable").html(analise);
    $("ul.tabs").tabs();
    $("#filds").modal("open");
    $("select").material_select();

    return analise;
  },
  activeDate = function () {
    if ($("td[time=true]").length) {
      $("td[time=true]").click(function () {
        $("td[time=true]").dblclick(function () {
          $(".calendary").click();
          $(".picker__today")
            .attr("data-pick", new Date($(this).text()).getTime())
            .click();
        });
      });
      console.log("Data encontrada");
    } else {
      // setTimeout(activeDate,1000);
      console.log("Sem data ...");
    }
  },
  view = function (f) {
    let dataBase = readData[f];
    let thead =
        `<th class="red-text">ID</th>` +
        Object.keys(dataBase.types)
          .map((h) => `<th>${h}</th>`)
          .join(""),
      ct = 1,
      tbody = dataBase.body
        .slice(0, +analise.value)
        .map((l) =>
          Object.values(l)
            .map(
              (b, e) =>
                `${e == 0 ? '<td class="red-text">' + ct++ + "</td>" : ""}<td ${
                  (b + "").includes("e)") ? 'time="true"' : ""
                }>${b}</td>`
            )
            .join("")
        )
        .map((r, i) => `<tr title="Linha ${i + 1}">${r}</tr>`)
        .join(""),
      analise_return = `<table class="striped responsive-table">
                                        <thead>${thead}</thead>
                                        <tbody>${tbody}</tbody>
                                    </table>`;

    $(".zoneView").html(analise_return);
    $("#viewFields").modal("open");
    activeDate();
    return analise_return;
  },
  transformeData = function (f) {
    let inp = data_file[f];
    if (inp) {
      if (transform) actionAlert("Transformação iniciada", 3);
      let pl = $("#jumpHead").is(":checked") ? 1 : 0,
        colunas = [];
      if ($("#auto-division").is(":checked"))
        divisor.value = isSeparation(
          data_file[f].split("\n").filter((row) => !!row.trim())[0 + pl]
        );

      if (divisor.length < 1) alert("Defina o divisor de Campos");
      else {
        if (transform) actionAlert("Processando informações", 1);
        let limits = eval(`/[${string.value}]/g`),
          linhas = inp.split("\n").filter((row) => !!row.trim()), // Dividir em linhas
          header = Object.keys(saida.types),
          cabecalho =
            header.length < 1
              ? linhas[0 + pl]
                  .split(divisor.value)
                  .map((c) => c.replace(limits, ""))
              : header,
          nameF = f.replace(/([^a-zA-Z0-9])+/g, "");

        if (readData[nameF]) {
          cabecalho = Object.keys(readData[nameF].types);
        }

        linhas.slice(1 + pl).map((linha, l) =>
          linha
            .split(divisor.value) // Dividir em colunas
            .map((coluna, c) => {
              if (!colunas[l]) colunas[l] = {};
              colunas[l][cabecalho[c]] = coluna.replace(limits, "");
            })
        );

        types =
          header.length < 1 ? checkData({ cabecalho, colunas }) : saida.types;
        types = readData[nameF] ? readData[nameF].types : types;

        if (transform) actionAlert("Transformação realizada com sucesso!", 4);
        if (Object.values(readData).length) setTimeout(generationModal, 500);
        let final = {
          name: f,
          length: (JSON.stringify(colunas).length / 1000000).toFixed(1) + " Mb",
          types,
          body: colunas,
          sizes: saida.sizes,
        };
        readData[nameF] = final;
        if ($("#automatic").is(":checked")) padronize(nameF);
        else {
          dropButton("Padronizar:", nameF, "show()");
          dropButton("Ver:", nameF, "show()");
        }

        return final;
      }
    }
    transform = false;
  },
  readFilds = function () {
    for (f in readData) {
      let analise = [];

      $(`input.field[readfile=${f}]`).each(function () {
        analise[$(this).val()] = $(`select.field[readfile=${f}]`)
          .eq($(this).attr("camp"))
          .val();
      });

      readData[f].types = analise;
    }
  },
  fileProccAut = function (f) {
    transform = true;
    let file = infile.files[f],
      name = file.name.replace(/([^a-zA-Z0-9])+/g, "");
    openFile(file);
    transformeData(data_file[file.name]);
    // padronize(name);
    // Bloqueio de estado: Se modo automatico, visao desabilitada
    if ($("#preview").is(":checked") && !$("#multiple").is(":checked"))
      view(name);
  },
  fileProcc = function (f) {
    transform = true;
    let file = readData[f].name;
    transformeData(file);
    // padronize(f);
    // Bloqueio de estado: Se modo automatico, visao desabilitada
    if ($("#preview").is(":checked") && !$("#multiple").is(":checked")) view(f);
  },
  dropButton = function (t = "Ler:", f, a) {
    $(".zoneAction a").each(function () {
      let nome = $(this).text().split(" ").reverse()[0];
      if (
        $(this).text().includes(t) &&
        f == nome.replace(/([^a-zA-Z0-9])+/g, "")
      )
        eval(`$(this).${a}`);
    });
  },
  multipleProc = function () {
    var files = infile.files,
      buttons = "";
    if (files.length > 0) {
      for (f in files) {
        if (!["length", "item"].includes(f)) {
          let file = files[f],
            name = file.name.replace(/([^a-zA-Z0-9])+/g, ""),
            id = Object.keys(data_file).indexOf(file.name);
          buttons += `<a style="display:none" onclick="fileProcc('${name}')" title="Iniciar transformação" class="btn green dark-2 col s12 waves-effect waves-orange btProc">Processar: ${file.name}</a>`;
          buttons += `<a style="display:none" onclick="view('${name}')" title="Iniciar analise para visão" class="btn blue dark-2 col s12 waves-effect waves-green btProc">Ver: ${file.name}</a>`;
          if (!$("#automatic").is(":checked"))
            buttons += `<a style="display:none" onclick="padronize('${name}')" title="Padronizar visão" class="btn red dark-1 col s12 waves-effect waves-green btProc">Padronizar: ${file.name}</a>`;
          buttons += `<a onclick="openFile(infile.files[${f}])" title="Iniciar leitura" class="btn orange dark-2 col s12 waves-effect waves-green btProc">Ler: ${file.name}</a>`;
        }
      }
      $(".zoneAction").append(buttons);
    }
  },
  checkFila = function () {
    var files = infile.files;
    for (f in files) {
      if (!["length", "item"].includes(f)) {
        let file = files[f];
        if (!fila.includes(file.name)) fileProccAut(f);
      }
    }
  },
  outSQL = function (padFile, tableName) {
    let analise = [
      `INSERT INTO ${tableName} (` +
        Object.keys(padFile.types)
          .map((e) => (e.search(/\d*([^a-z0-9_])/) >= 0 ? `"${e}"` : e))
          .join(",") +
        ")\nVALUES",
    ];
    padFile.body.map((linha) => {
      let itens = [];
      for (item in linha) {
        itens.push(
          ["Int", "Float", "Bool"].includes(padFile.types[item])
            ? `${linha[item]}`
            : `'${("" + linha[item]).replace("'", "/'")}'`
        );
      }
      analise.push(`(${itens.join(",")}),`);
    });
    let saida = analise.join("\n").replace(",\n(false),", "");
    return saida;
  },
  outCSV = function (padFile) {
    let analise = Object.keys(padFile.types).join(divisor.value) + "\n";
    padFile.body.map((linha) => {
      let itens = [];
      for (item in linha) {
        itens.push(
          ["Int", "Float", "Bool"].includes(padFile.types[item])
            ? `${linha[item]}`
            : `'${("" + linha[item]).replace("'", "/'")}'`
        );
      }
      analise += `${itens.join(divisor.value)}\n`;
    });
    return analise;
  },
  openFile = function (file = infile.files[0]) {
    saida = { types: {}, body: [], sizes: {} };

    if (file) {
      if (
        file.type != "text/csv" &&
        file.name.split(".").reverse()[0].toLowerCase() != "csv"
      ) {
        actionAlert("Formato inválido", 0);
      } else {
        actionAlert("Leitura em andamento ...", 1);
        var reader = new FileReader();
        reader.onload = function () {
          data_file[file.name] = reader.result;
          actionAlert("Leitura finalizada!", 2);
          $(".st_prad").show();
          dropButton(
            "Ler:",
            file.name.replace(/([^a-zA-Z0-9])+/g, ""),
            "remove()"
          );
          dropButton(
            "Processar:",
            file.name.replace(/([^a-zA-Z0-9])+/g, ""),
            "show()"
          );
          readData[file.name.replace(/([^a-zA-Z0-9])+/g, "")] = transformeData(
            file.name
          ); // Processamento
          if ($("#automatic").is(":checked")) {
            $(".zoneAction a").each(function () {
              let nameFile = $(this).text().split(" ")[1];
              if (nameFile == file.name) {
                if (!fila.includes(file.name)) {
                  $(this).click();
                  fila.push(file.name);
                  if ($("#multiple").is(":checked")) checkFila();
                }
              }
            });
          }
        };

        if ($("#precod").is(":checked")) {
          let cod = new TextEncoder(reader.result).encoding;
          $("#codification-input").val(cod.toUpperCase());
          reader.readAsText(file, cod);
        } else reader.readAsText(file, codification);
      }
    } else {
      actionAlert("Falha na leitura", 0);
    }
  },
  drawImg = function (text) {
    let part = text.slice(0, 800).match(/.{1,50}/g),
      canvas = document.createElement("canvas");

    canvas.width = "250";
    canvas.height = "250";

    let ctx = canvas.getContext("2d");

    ctx.font = "10px Arial";
    part.map((t, i) => ctx.fillText(t, 10, 15 * (1 + i)));

    return canvas.toDataURL("image/png", 1);
  },
  generationModal = function () {
    let out = '<div class="carousel">';
    for (f in readData) {
      let file = JSON.stringify(readData[f]);
      out += `<a class="carousel-item" download="Transformacao_${f}.${typeOp.value.toLowerCase()}" href="${createButtonDown(
        f
      )}"><img src="${drawImg(file)}"></a>`;
    }

    $(".zoneDown").html(out).show();
    $(".carousel").carousel();
  },
  data = {
    "ISO-8859-1": null,
    "ISO-8859-2": null,
    "ISO-8859-3": null,
    "ISO-8859-4": null,
    "ISO-8859-5": null,
    "ISO-8859-6": null,
    "ISO-8859-7": null,
    "ISO-8859-8": null,
    "ISO-8859-9": null,
    "ISO-8859-10": null,
    "ISO-8859-11": null,
    "ISO-8859-13": null,
    "ISO-8859-14": null,
    "ISO-8859-15": null,
    "ISO-8859-16": null,
    CP437: null,
    CP737: null,
    CP850: null,
    CP852: null,
    CP855: null,
    CP857: null,
    CP858: null,
    CP860: null,
    CP861: null,
    CP863: null,
    CP865: null,
    CP866: null,
    CP869: null,
    "Windows-1250": null,
    "Windows-1251": null,
    "Windows-1252": null,
    "Windows-1253": null,
    "Windows-1254": null,
    "Windows-1255": null,
    "Windows-1256": null,
    "Windows-1257": null,
    "Windows-1258": null,
    "UTF-4": null,
    "UTF-8": null,
    "UTF-16": null,
  };

$(document).ready(function () {
  $("#codification-input.autocomplete").autocomplete({
    data,
    limit: 3,
    onAutocomplete: function (val) {
      codification = val;
    },
    minLength: 1,
  });
  $("#typeOp.autocomplete").autocomplete({
    data: { JSON: null, SQL: null, CSV: null },
    limit: 3,
    onAutocomplete: function (val) {
      output = val;
    },
    minLength: 1,
  });
  $("input#input_text, textarea#output").characterCounter();
  $(".modal").modal();
  $(".collapsible").collapsible();
  $(".datepicker").pickadate({
    selectMonths: true, // Creates a dropdown to control month
    selectYears: 15, // Creates a dropdown of 15 years to control year,
    today: "Today",
    clear: "Clear",
    close: "Ok",
    closeOnSelect: false, // Close upon selecting a date,
    container: undefined, // ex. 'body' will append picker to body
  });

  if (
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    )
  ) {
    $("#divisor").click(() => {
      Materialize.toast("Caractere para a divisor de campos", 4000);
    });
    $("#string").click(() => {
      Materialize.toast("Caractere para a limitação de um texto", 4000);
    });
    $("#analise").click(() => {
      Materialize.toast(
        "Quantidade de linhas para pesquisar tipos de campos",
        4000
      );
    });
    $("#codification-input").click(() => {
      Materialize.toast("Codificação de texto", 4000);
    });
    $("#jumpHead").click(() => {
      Materialize.toast("Pular primeira linha para criar cabeçalho", 4000);
    });
    $("#preview").click(() => {
      Materialize.toast("Mostrar parte da saída de informações", 4000);
    });
    $("#output").click(() => {
      Materialize.toast("Saída de respostas do sistema", 4000);
    });
    $("#automatic").click(() => {
      Materialize.toast("Execultar passos automaticamente", 4000);
    });
    $("#notification").click(() => {
      Materialize.toast("Alerta estados atuais do processo", 4000);
    });
    $("#multiple").click(() => {
      Materialize.toast("Processamento de múltiplos arquivos", 4000);
    });
  }
  $("#edit_column").click(() => {
    createConfigData();
  });
  $("#confirm_types").click(readFilds);
  $("#infile").change(() => {
    let files = infile.files;
    $(".st_chos").remove();
    $(".st_prog").hide();
    $(".st_prad").hide();
    $(".st_read").show();
    multipleProc();
    if ($("#reading").is(":checked")) {
      for (f in files) {
        if (!["length", "item"].includes(f)) {
          let file = files[f];
          if (!data_file.includes(file.name)) openFile(file);
        }
      }
    }
  });

  $("body")
    .on(
      "drag dragstart dragend dragover dragenter dragleave drop",
      function (e) {
        e.preventDefault();
        // e.stopPropagation();
      }
    )
    .on("dragover dragenter", function () {
      $(".ipAdv").show();
    })
    .on("drop", function () {
      $(".ipAdv").hide();
    });

  $(".objAdv")
    .on("dragleave dragend drop", function (event) {
      $(".objAdv").removeClass("active");
      $(".ipAdv").hide();
    })
    .on("dragover dragenter", function () {
      $(".objAdv").addClass("active");
    })
    .on("mouseover", function () {
      $(".ipAdv").hide();
    });

  if (Notification.permission !== "granted" && false)
    // Desativado
    Notification.requestPermission();
  // Criar regras para a utilização de ações
  // Processar com numeros
  /**
   * @param mudar_arquivo
   * @function function_correnct_alert_action
   * @argument {Arquivos anteriores, que não foram lidos}
   * @throws {Serám perdidos}
   */

  /**
   * @param mudar_estrutura
   * @function transformeData
   * @event padronize
   * @argument {Limpa e aplicar alterações}
   * @throws {Primeira função volta os valores originais e a segundo repadroniza}
   */

  /**
   * @param processo_automatico
   * @argument {Deve usar três funções: Auto-leitura, Pro-Múltiplo e Automático}
   * @param __
   * @throws {Primeira função realiza a leitura convecional do arquivo ²}
   * @throws {Segunda inicia a fila de vários arquivos ¹}
   * @throws {Terceira realiza todos os estapas necessárias para que o arquivo seja transformado ³}
   */
});

function dropHandler(ev) {
  ev.preventDefault();

  if (ev.dataTransfer.items) {
    // Use DataTransferItemList interface to access the file(s)
    infile.files = ev.dataTransfer.files;
    $("#infile").trigger("change");
    for (var i = 0; i < ev.dataTransfer.items.length; i++) {
      // If dropped items aren't files, reject them
      if (
        ev.dataTransfer.items[i].kind === "file" &&
        ev.dataTransfer.items[i].type
      ) {
        let file = ev.dataTransfer.items[i].getAsFile();
        console.log("... file[" + i + "].name = " + file.name);
      } else {
        console.log({
          type: ev.dataTransfer.items[i].kind,
          this: ev.dataTransfer.items[i].getAsFile(),
        });
      }
    }
  } else {
    // Use DataTransfer interface to access the file(s)
    for (var i = 0; i < ev.dataTransfer.files.length; i++) {
      console.log(
        "... file[" + i + "].name = " + ev.dataTransfer.files[i].name
      );
    }
  }
}
