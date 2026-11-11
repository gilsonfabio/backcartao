const connection = require('../database/connection');

module.exports = {  
  async dashboardCompras(request, response) {
    try {
      const ano = Number(request.query.ano);

      // Filtro opcional por convênio.
      const convenioInformado = request.query.convenio;

      const convenio = (
        convenioInformado !== undefined &&
        convenioInformado !== null &&
        convenioInformado !== ''
      )
        ? Number(convenioInformado)
        : null;

      // Validação do ano.
      if (!Number.isInteger(ano) || ano < 2000 || ano > 2100) {
        return response.status(400).json({
          success: false,
          message: 'Informe um ano válido.'
        });
      }

      // Validação do convênio.
      if (
        convenio !== null &&
        (!Number.isInteger(convenio) || convenio <= 0)
      ) {
        return response.status(400).json({
          success: false,
          message: 'Informe um convênio válido.'
        });
      }

      const dataInicial = `${ano}-01-01`;
      const dataFinal = `${ano + 1}-01-01`;

      // Consulta agrupando as compras por mês.
      const consulta = connection('compras as c')
        .select(
          connection.raw('MONTH(c.emissao_compra) AS mes')
        )
        .count({
          quantidade: 'c.id_compra'
        })
        .sum({
          valor: 'c.valor_compra'
        })
        .where('c.emissao_compra', '>=', dataInicial)
        .where('c.emissao_compra', '<', dataFinal)
        .whereNot('c.status_compra', 'C');

      // Aplica o filtro por convênio, quando informado.
      if (convenio !== null) {
        consulta.where('c.convenio_compra', convenio);
      }

      // Executa a consulta agrupando por mês.
      const resultado = await consulta
        .groupByRaw('MONTH(c.emissao_compra)')
        .orderBy('mes');

      // Garante que os 12 meses sejam apresentados.
      const meses = Array.from({ length: 12 }, (_, index) => {
        const numeroMes = index + 1;

        const encontrado = resultado.find(
          (item) => Number(item.mes) === numeroMes
        );

        return {
          mes: numeroMes,
          quantidade: Number(encontrado?.quantidade || 0),
          valor: Number(encontrado?.valor || 0)
        };
      });

      // Calcula os indicadores gerais do ano.
      const totalCompras = meses.reduce(
        (total, item) => total + item.quantidade,
        0
      );

      const valorTotal = meses.reduce(
        (total, item) => total + item.valor,
        0
      );

      return response.json({
        success: true,
        ano,
        convenio,
        totalCompras,
        valorTotal,
        meses
      });

    } catch (error) {
      console.error('Erro no dashboard de compras:', error);

      return response.status(500).json({
        success: false,
        message: 'Erro ao carregar o dashboard de compras.'
      });
    }
  },
    
  async relatorioCompras(request, response) {
    try {
      const ano = Number(request.query.ano);

      const pagina = Math.max(
        1,
        Number(request.query.pagina) || 1
      );

      const limite = Math.min(
        100,
        Math.max(1, Number(request.query.limite) || 50)
      );

      const mesInformado = request.query.mes;

      const mes = (
        mesInformado !== undefined &&
        mesInformado !== null &&
        mesInformado !== ''
      )
        ? Number(mesInformado)
        : null;

      // NOVO FILTRO DE CONVÊNIO
      const convenioInformado = request.query.convenio;

      const convenio = (
        convenioInformado !== undefined &&
        convenioInformado !== null &&
        convenioInformado !== ''
      )
        ? Number(convenioInformado)
        : null;

      // Validação do ano.
      if (!Number.isInteger(ano) || ano < 2000 || ano > 2100) {
        return response.status(400).json({
          success: false,
          message: 'Informe um ano válido.'
        });
      }

      // Validação do mês.
      if (
        mes !== null &&
        (!Number.isInteger(mes) || mes < 1 || mes > 12)
      ) {
        return response.status(400).json({
          success: false,
          message: 'Informe um mês válido, entre 1 e 12.'
        });
      }

      // Validação do convênio.
      if (
        convenio !== null &&
        (!Number.isInteger(convenio) || convenio <= 0)
      ) {
        return response.status(400).json({
          success: false,
          message: 'Informe um convênio válido.'
        });
      }

      const offset = (pagina - 1) * limite;

      // Define o período da consulta.
      let dataInicial;
      let dataFinal;

      if (mes !== null) {
        const mesFormatado = String(mes).padStart(2, '0');

        dataInicial = `${ano}-${mesFormatado}-01`;

        const proximoMes = new Date(ano, mes, 1);

        const proximoAno = proximoMes.getFullYear();

        const proximoMesNumero = String(
          proximoMes.getMonth() + 1
        ).padStart(2, '0');

        dataFinal = `${proximoAno}-${proximoMesNumero}-01`;
      } else {
        dataInicial = `${ano}-01-01`;
        dataFinal = `${ano + 1}-01-01`;
      }

      /*
      * FILTRO BASE
      *
      * Aplicado nos totalizadores e na listagem.
      */
      const aplicarFiltros = query => {
        query
          .where('c.emissao_compra', '>=', dataInicial)
          .where('c.emissao_compra', '<', dataFinal)
          .whereNot('c.status_compra', 'C');

        // Aplica o filtro de convênio somente
        // quando um convênio foi informado.
        if (convenio !== null) {
          query.where('c.convenio_compra', convenio);
        }

        return query;
      };

      /*
      * TOTALIZADORES
      */
      const [resumo] = await aplicarFiltros(
        connection('compras as c')
      )
        .count({ total: 'c.id_compra' })
        .sum({ valorTotalVendido: 'c.valor_compra' });

      const total = Number(resumo.total || 0);

      const valorTotalVendido = Number(
        resumo.valorTotalVendido || 0
      );

      /*
      * LISTAGEM PAGINADA
      */
      const listaCompras = await aplicarFiltros(
        connection('compras as c')
      )
        .leftJoin(
          'associados as a',
          'c.id_servidor',
          'a.id_user'
        )
        .leftJoin(
          'convenios as cv',
          'c.convenio_compra',
          'cv.id_Convenio'
        )
        .select(
          'c.*',
          'a.nome_user',
          'cv.con_Fantasia as con_Fantasia'
        )
        .orderBy('c.emissao_compra', 'asc')
        .orderBy('a.nome_user', 'asc')
        .orderBy('c.id_compra', 'asc')
        .limit(limite)
        .offset(offset);

      /*
      * BUSCA DAS PARCELAS
      */
      const idsCompras = listaCompras.map(
        compra => compra.id_compra
      );

      let parcelas = [];

      if (idsCompras.length > 0) {
        parcelas = await connection('venc_compra')
          .whereIn('id_compra', idsCompras)
          .select(
            'id_compra',
            'id_parcela',
            'venc_parcela',
            'valor_parcela',
            'status_parcela',
            'par_servidor',
            'par_nomServidor',
            'par_secretaria',
            'par_secOrgao',
            'par_convenio',
            'par_datAntecipacao',
            'vct_original'
          )
          .orderBy('id_compra', 'asc')
          .orderBy('id_parcela', 'asc');
      }

      // Agrupa as parcelas por compra.
      const parcelasPorCompra = {};

      parcelas.forEach(parcela => {
        if (!parcelasPorCompra[parcela.id_compra]) {
          parcelasPorCompra[parcela.id_compra] = [];
        }

        parcelasPorCompra[parcela.id_compra].push({
          id_parcela: parcela.id_parcela,
          venc_parcela: parcela.venc_parcela,
          valor_parcela: parcela.valor_parcela,
          status_parcela: parcela.status_parcela,
          par_servidor: parcela.par_servidor,
          par_nomServidor: parcela.par_nomServidor,
          par_secretaria: parcela.par_secretaria,
          par_secOrgao: parcela.par_secOrgao,
          par_convenio: parcela.par_convenio,
          par_datAntecipacao: parcela.par_datAntecipacao,
          vct_original: parcela.vct_original
        });
      });

      // Associa as parcelas às compras.
      const resultado = listaCompras.map(compra => ({
        ...compra,
        parcelas: parcelasPorCompra[compra.id_compra] || []
      }));

      return response.status(200).json({
        success: true,
        ano,
        mes,
        convenio,

        // Totalizadores do período filtrado.
        total,
        totalVendas: total,
        valorTotalVendido,

        // Paginação.
        pagina,
        limite,
        totalPaginas: Math.ceil(total / limite),

        // Compras da página solicitada.
        compras: resultado
      });

    } catch (error) {
      console.error('Erro no relatório de compras:', error);

      return response.status(500).json({
        success: false,
        message: 'Erro ao gerar relatório de compras.',
        error: error.message
      });
    }
  },
    
  async relatorioComprasDivergentes(request, response) {
    try {
      const ano = Number(request.query.ano);

      const pagina = Math.max(
        1,
        Number(request.query.pagina) || 1
      );

      const limite = Math.min(
        100,
        Math.max(1, Number(request.query.limite) || 50)
      );

      // Filtro opcional por mês.
      const mesInformado = request.query.mes;

      const mes = (
        mesInformado !== undefined &&
        mesInformado !== null &&
        mesInformado !== ''
      )
        ? Number(mesInformado)
        : null;

      // Validação do ano.
      if (!Number.isInteger(ano) || ano < 2000 || ano > 2100) {
        return response.status(400).json({
          success: false,
          message: 'Informe um ano válido.'
        });
      }

      // Validação do mês.
      if (
        mes !== null &&
        (!Number.isInteger(mes) || mes < 1 || mes > 12)
      ) {
        return response.status(400).json({
          success: false,
          message: 'Informe um mês válido, entre 1 e 12.'
        });
      }

      const offset = (pagina - 1) * limite;

      // Define o período.
      let dataInicial;
      let dataFinal;

      if (mes !== null) {
        const mesFormatado = String(mes).padStart(2, '0');

        dataInicial = `${ano}-${mesFormatado}-01`;

        const proximoMes = new Date(ano, mes, 1);

        const proximoAno = proximoMes.getFullYear();

        const proximoMesNumero = String(
          proximoMes.getMonth() + 1
        ).padStart(2, '0');

        dataFinal = `${proximoAno}-${proximoMesNumero}-01`;

      } else {
        dataInicial = `${ano}-01-01`;
        dataFinal = `${ano + 1}-01-01`;
      }

      // Consulta das compras com divergência.
      const consulta = connection('compras as c')
        .leftJoin(
          'associados as a',
          'c.id_servidor',
          'a.id_user'
        )
        .leftJoin(
          'convenios as cv',
          'c.convenio_compra',
          'cv.id_Convenio'
        )
        .where('c.emissao_compra', '>=', dataInicial)
        .where('c.emissao_compra', '<', dataFinal)
        .whereNot('c.status_compra', 'C')
        .whereExists(function () {
          this.select(connection.raw('1'))
            .from('venc_compra as vc')
            .whereRaw('vc.id_compra = c.id_compra')
            .whereRaw('vc.par_nomServidor <> a.nome_user');
        });

      // Total de compras divergentes.
      const [{ total }] = await consulta
        .clone()
        .count({
          total: 'c.id_compra'
        });

      // Compras da página.
      const listaCompras = await consulta
        .clone()
        .select(
          'c.*',
          'a.nome_user',
          'cv.con_Fantasia as con_Fantasia'
        )
        .orderBy('c.emissao_compra', 'asc')
        .orderBy('a.nome_user', 'asc')
        .orderBy('c.id_compra', 'asc')
        .limit(limite)
        .offset(offset);

      // IDs das compras.
      const idsCompras = listaCompras.map(
        compra => compra.id_compra
      );

      let parcelas = [];

      // Busca parcelas somente das compras divergentes.
      if (idsCompras.length > 0) {
        parcelas = await connection('venc_compra')
          .whereIn('id_compra', idsCompras)
          .select(
            'id_compra',
            'id_parcela',
            'venc_parcela',
            'valor_parcela',
            'status_parcela',
            'par_servidor',
            'par_nomServidor',
            'par_secretaria',
            'par_secOrgao',
            'par_convenio',
            'par_datAntecipacao',
            'vct_original'
          )
          .orderBy('id_compra', 'asc')
          .orderBy('id_parcela', 'asc');
      }

      // Agrupa parcelas por compra.
      const parcelasPorCompra = {};

      parcelas.forEach(parcela => {
        if (!parcelasPorCompra[parcela.id_compra]) {
          parcelasPorCompra[parcela.id_compra] = [];
        }

        parcelasPorCompra[parcela.id_compra].push({
          id_parcela: parcela.id_parcela,
          venc_parcela: parcela.venc_parcela,
          valor_parcela: parcela.valor_parcela,
          status_parcela: parcela.status_parcela,
          par_servidor: parcela.par_servidor,
          par_nomServidor: parcela.par_nomServidor,
          par_secretaria: parcela.par_secretaria,
          par_secOrgao: parcela.par_secOrgao,
          par_convenio: parcela.par_convenio,
          par_datAntecipacao: parcela.par_datAntecipacao,
          vct_original: parcela.vct_original
        });
      });

      // Associa parcelas às compras.
      const resultado = listaCompras.map(compra => ({
        ...compra,
        parcelas: parcelasPorCompra[compra.id_compra] || []
      }));

      return response.status(200).json({
        success: true,
        ano,
        mes,
        total: Number(total),
        pagina,
        limite,
        totalPaginas: Math.ceil(Number(total) / limite),
        compras: resultado
      });

    } catch (error) {
      console.error(
        'Erro no relatório de compras divergentes:',
        error
      );

      return response.status(500).json({
        success: false,
        message: 'Erro ao gerar relatório de compras divergentes.',
        error: error.message
      });
    }
  },
    
  async dashboardComprasLiquidas(request, response) {
    try {
      const ano = Number(request.query.ano);

      // Filtro opcional por convênio.
      const convenioInformado = request.query.convenio;

      const convenio = (
        convenioInformado !== undefined &&
        convenioInformado !== null &&
        convenioInformado !== ''
      )
        ? Number(convenioInformado)
        : null;

      // Validação do ano.
      if (!Number.isInteger(ano) || ano < 2000 || ano > 2100) {
        return response.status(400).json({
          success: false,
          message: 'Informe um ano válido.'
        });
      }

      // Validação do convênio.
      if (
        convenio !== null &&
        (!Number.isInteger(convenio) || convenio <= 0)
      ) {
        return response.status(400).json({
          success: false,
          message: 'Informe um convênio válido.'
        });
      }

      // Consulta das parcelas.
      const consulta = connection('venc_compra as vc')
        .innerJoin(
          'compras as c',
          'vc.id_compra',
          'c.id_compra'
        )
        .innerJoin(
          'convenios as co',
          'c.convenio_compra',
          'co.id_Convenio'
        )
        .innerJoin(
          'ramo_atividade as ra',
          'co.con_RamAtiv',
          'ra.id_Ramo'
        )
        .select(
          connection.raw('YEAR(vc.venc_parcela) AS ano'),
          connection.raw('MONTH(vc.venc_parcela) AS mes')
        )
        .sum({
          valorBruto: 'vc.valor_parcela'
        })
        .sum({
          valorTaxa: connection.raw(
            'vc.valor_parcela * (ra.ram_TaxaAdm / 100)'
          )
        })
        .sum({
          valorLiquido: connection.raw(
            'vc.valor_parcela - (vc.valor_parcela * (ra.ram_TaxaAdm / 100))'
          )
        })
        .where('vc.status_parcela', 'A')
        .where('vc.venc_parcela', '>=', `${ano}-01-01`)
        .where('vc.venc_parcela', '<', `${ano + 1}-01-01`)
        .whereNot('c.status_compra', 'C');

      // Aplica o filtro por convênio.
      if (convenio !== null) {
        consulta.where('c.convenio_compra', convenio);
      }

      // Agrupa os valores por mês.
      const resultado = await consulta
        .groupByRaw(
          'YEAR(vc.venc_parcela), MONTH(vc.venc_parcela)'
        )
        .orderBy('mes');

      // Garante os 12 meses.
      const meses = Array.from({ length: 12 }, (_, index) => {
        const numeroMes = index + 1;

        const encontrado = resultado.find(
          item => Number(item.mes) === numeroMes
        );

        return {
          mes: numeroMes,
          valorBruto: Number(encontrado?.valorBruto || 0),
          valorTaxa: Number(encontrado?.valorTaxa || 0),
          valorLiquido: Number(encontrado?.valorLiquido || 0)
        };
      });

      // Totalizadores anuais.
      const totalBruto = meses.reduce(
        (total, item) => total + item.valorBruto,
        0
      );

      const totalTaxa = meses.reduce(
        (total, item) => total + item.valorTaxa,
        0
      );

      const totalLiquido = meses.reduce(
        (total, item) => total + item.valorLiquido,
        0
      );

      return response.status(200).json({
        success: true,
        ano,
        convenio,
        totalBruto,
        totalTaxa,
        totalLiquido,
        meses
      });

    } catch (error) {
      console.error(
        'Erro no dashboard de compras líquidas:',
        error
      );

      return response.status(500).json({
        success: false,
        message: 'Erro ao carregar o dashboard de compras líquidas.'
      });
    }
  },

};
