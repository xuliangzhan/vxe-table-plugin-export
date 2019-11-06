import XEUtils from 'xe-utils/methods/xe-utils'
import VXETable from 'vxe-table/lib/vxe-table'
import * as XLSX from 'xlsx'

function toBuffer(wbout: any) {
  let buf = new ArrayBuffer(wbout.length)
  let view = new Uint8Array(buf)
  for (let index = 0; index !== wbout.length; ++index) view[index] = wbout.charCodeAt(index) & 0xFF
  return buf
}

function exportXLSX(params: any) {
  const { options, columns, datas } = params
  const { sheetName, type, isHeader, original } = options
  const colHead: any = {}
  if (isHeader) {
    columns.forEach((column: any) => {
      colHead[column.id] = original ? column.property : column.getTitle()
    })
  }
  const rowList = datas.map((row: any) => {
    const item: any = {}
    columns.forEach((column: any) => {
      item[column.id] = original ? XEUtils.get(row, column.property) : row[column.id]
    })
    return item
  })
  const book = XLSX.utils.book_new()
  const sheet = XLSX.utils.json_to_sheet((isHeader ? [colHead] : []).concat(rowList), { skipHeader: true })
  // 转换数据
  XLSX.utils.book_append_sheet(book, sheet, sheetName)
  const wbout = XLSX.write(book, { bookType: type, bookSST: false, type: 'binary' })
  const blob = new Blob([toBuffer(wbout)], { type: 'application/octet-stream' })
  // 保存导出
  download(blob, options)
}

function download(blob: Blob, options: any) {
  if (window.Blob) {
    const { filename, type } = options
    if (navigator.msSaveBlob) {
      navigator.msSaveBlob(blob, filename)
    } else {
      var linkElem = document.createElement('a')
      linkElem.target = '_blank'
      linkElem.download = `${filename}.${type}`
      linkElem.href = URL.createObjectURL(blob)
      document.body.appendChild(linkElem)
      linkElem.click()
      document.body.removeChild(linkElem)
    }
  } else {
    console.error('[vxe-table-plugin-export] The current environment does not support exports.')
  }
}

function replaceDoubleQuotation(val: string) {
  return val.replace(/^"/, '').replace(/"$/, '')
}

function parseCsv(columns: any[], content: string) {
  const list: string[] = content.split('\n')
  const fields: any[] = []
  const rows: any[] = []
  if (list.length) {
    const rList: string[] = list.slice(1)
    list[0].split(',').forEach((val: string) => {
      const field: string = replaceDoubleQuotation(val)
      if (field) {
        fields.push(field)
      }
    })
    rList.forEach((r: string) => {
      if (r) {
        const item: any = {}
        r.split(',').forEach((val: string, colIndex: number) => {
          item[fields[colIndex]] = replaceDoubleQuotation(val)
        })
        rows.push(item)
      }
    })
  }
  return { fields, rows }
}

function checkImportData(columns: any[], fields: string[], rows: any[]) {
  let tableFields: string[] = []
  columns.forEach((column: any) => {
    let field: string = column.property
    if (field) {
      tableFields.push(field)
    }
  })
  return tableFields.every((field: string) => fields.includes(field))
}

function importXLSX(params: any, evnt: any) {
  const { $table, columns } = params
  const { importCallback } = $table
  const file = evnt.target.files[0]
  const fileReader = new FileReader()
  fileReader.onload = (e: any) => {
    const workbook = XLSX.read(e.target.result, { type: 'binary' })
    const csvData: string = XLSX.utils.sheet_to_csv(workbook.Sheets.Sheet1)
    const rest: any = parseCsv(columns, csvData)
    const { fields, rows } = rest
    const status = checkImportData(columns, fields, rows)
    if (status) {
      $table.createData(rows)
        .then((data: any[]) => $table.reloadData(data))
    }
    if (importCallback) {
      importCallback(status)
    }
  }
  fileReader.readAsBinaryString(file)
}

function handleImportEvent(params: any, evnt: any) {
  switch (params.options.type) {
    case 'xlsx':
      importXLSX(params, evnt)
      return false
  }
}

function handleExportEvent(params: any) {
  switch (params.options.type) {
    case 'xlsx':
      exportXLSX(params)
      return false
  }
}

/**
 * 基于 vxe-table 表格的增强插件，支持导出 xlsx 等格式
 */
export const VXETablePluginExport = {
  install(xtable: typeof VXETable) {
    Object.assign(xtable.types, { xlsx: 1 })
    xtable.interceptor.mixin({
      'event.import': handleImportEvent,
      'event.export': handleExportEvent
    })
  }
}

if (typeof window !== 'undefined' && window.VXETable) {
  window.VXETable.use(VXETablePluginExport)
}

export default VXETablePluginExport
