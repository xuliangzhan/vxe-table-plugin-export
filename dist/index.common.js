"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = exports.VXETablePluginExportXLSX = void 0;

var _xeUtils = _interopRequireDefault(require("xe-utils/methods/xe-utils"));

var _xlsx = _interopRequireDefault(require("xlsx"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

/* eslint-disable no-unused-vars */

/* eslint-enable no-unused-vars */
var _vxetable;

function getFooterCellValue($table, opts, rows, column) {
  var cellValue = rows[$table.$getColumnIndex(column)];
  return cellValue;
}

function toBuffer(wbout) {
  var buf = new ArrayBuffer(wbout.length);
  var view = new Uint8Array(buf);

  for (var index = 0; index !== wbout.length; ++index) {
    view[index] = wbout.charCodeAt(index) & 0xFF;
  }

  return buf;
}

function getCellLabel(column, cellValue) {
  if (cellValue) {
    switch (column.cellType) {
      case 'string':
        break;

      case 'number':
        if (!isNaN(cellValue)) {
          return Number(cellValue);
        }

        break;

      default:
        if (cellValue.length < 12 && !isNaN(cellValue)) {
          return Number(cellValue);
        }

        break;
    }
  }

  return cellValue;
}

function exportXLSX(params) {
  var $table = params.$table,
      options = params.options,
      columns = params.columns,
      datas = params.datas;
  var sheetName = options.sheetName,
      isHeader = options.isHeader,
      isFooter = options.isFooter,
      original = options.original,
      message = options.message,
      footerFilterMethod = options.footerFilterMethod;
  var colHead = {};
  var footList = [];
  var sheetCols = [];

  if (isHeader) {
    columns.forEach(function (column) {
      colHead[column.id] = original ? column.property : column.getTitle();
      sheetCols.push({
        wpx: _xeUtils["default"].toInteger(column.renderWidth * 0.8)
      });
    });
  }

  var rowList = datas.map(function (item) {
    columns.forEach(function (column) {
      item[column.id] = getCellLabel(column, item[column.id]);
    });
    return item;
  });

  if (isFooter) {
    var _$table$getTableData = $table.getTableData(),
        footerData = _$table$getTableData.footerData;

    var footers = footerFilterMethod ? footerData.filter(footerFilterMethod) : footerData;
    footers.forEach(function (rows) {
      var item = {};
      columns.forEach(function (column) {
        item[column.id] = getFooterCellValue($table, options, rows, column);
      });
      footList.push(item);
    });
  }

  var book = _xlsx["default"].utils.book_new();

  var sheet = _xlsx["default"].utils.json_to_sheet((isHeader ? [colHead] : []).concat(rowList).concat(footList), {
    skipHeader: true
  }); // 列宽


  sheet['!cols'] = sheetCols; // 转换数据

  _xlsx["default"].utils.book_append_sheet(book, sheet, sheetName);

  var wbout = _xlsx["default"].write(book, {
    bookType: 'xlsx',
    bookSST: false,
    type: 'binary'
  });

  var blob = new Blob([toBuffer(wbout)], {
    type: 'application/octet-stream'
  }); // 保存导出

  downloadFile(blob, options);

  if (message !== false) {
    _vxetable.modal.message({
      message: _vxetable.t('vxe.table.expSuccess'),
      status: 'success'
    });
  }
}

function downloadFile(blob, options) {
  if (window.Blob) {
    var filename = options.filename,
        type = options.type;

    if (navigator.msSaveBlob) {
      navigator.msSaveBlob(blob, "".concat(filename, ".").concat(type));
    } else {
      var linkElem = document.createElement('a');
      linkElem.target = '_blank';
      linkElem.download = "".concat(filename, ".").concat(type);
      linkElem.href = URL.createObjectURL(blob);
      document.body.appendChild(linkElem);
      linkElem.click();
      document.body.removeChild(linkElem);
    }
  } else {
    console.error(_vxetable.t('vxe.error.notExp'));
  }
}

function replaceDoubleQuotation(val) {
  return val.replace(/^"/, '').replace(/"$/, '');
}

function parseCsv(columns, content) {
  var list = content.split('\n');
  var fields = [];
  var rows = [];

  if (list.length) {
    var rList = list.slice(1);
    list[0].split(',').map(replaceDoubleQuotation);
    rList.forEach(function (r) {
      if (r) {
        var item = {};
        r.split(',').forEach(function (val, colIndex) {
          if (fields[colIndex]) {
            item[fields[colIndex]] = replaceDoubleQuotation(val);
          }
        });
        rows.push(item);
      }
    });
  }

  return {
    fields: fields,
    rows: rows
  };
}

function checkImportData(columns, fields, rows) {
  var tableFields = [];
  columns.forEach(function (column) {
    var field = column.property;

    if (field) {
      tableFields.push(field);
    }
  });
  return tableFields.every(function (field) {
    return fields.includes(field);
  });
}

function importXLSX(params) {
  var columns = params.columns,
      options = params.options,
      file = params.file;
  var $table = params.$table;
  var _importResolve = $table._importResolve;
  var fileReader = new FileReader();

  fileReader.onload = function (e) {
    var workbook = _xlsx["default"].read(e.target.result, {
      type: 'binary'
    });

    var csvData = _xlsx["default"].utils.sheet_to_csv(workbook.Sheets.Sheet1);

    var _parseCsv = parseCsv(columns, csvData),
        fields = _parseCsv.fields,
        rows = _parseCsv.rows;

    var status = checkImportData(columns, fields, rows);

    if (status) {
      $table.createData(rows).then(function (data) {
        if (options.mode === 'append') {
          $table.insertAt(data, -1);
        } else {
          $table.reloadData(data);
        }
      });

      if (options.message !== false) {
        _vxetable.modal.message({
          message: _xeUtils["default"].template(_vxetable.t('vxe.table.impSuccess'), [rows.length]),
          status: 'success'
        });
      }
    } else if (options.message !== false) {
      _vxetable.modal.message({
        message: _vxetable.t('vxe.error.impFields'),
        status: 'error'
      });
    }

    if (_importResolve) {
      _importResolve(status);

      $table._importResolve = null;
    }
  };

  fileReader.readAsBinaryString(file);
}

function handleImportEvent(params) {
  if (params.options.type === 'xlsx') {
    importXLSX(params);
    return false;
  }
}

function handleExportEvent(params) {
  if (params.options.type === 'xlsx') {
    exportXLSX(params);
    return false;
  }
}
/**
 * 基于 vxe-table 表格的增强插件，支持导出 xlsx 格式
 */


var VXETablePluginExportXLSX = {
  install: function install(xtable) {
    var interceptor = xtable.interceptor;
    _vxetable = xtable;
    Object.assign(xtable.types, {
      xlsx: 1
    });
    interceptor.mixin({
      'event.import': handleImportEvent,
      'event.export': handleExportEvent
    });
  }
};
exports.VXETablePluginExportXLSX = VXETablePluginExportXLSX;

if (typeof window !== 'undefined' && window.VXETable) {
  window.VXETable.use(VXETablePluginExportXLSX);
}

var _default = VXETablePluginExportXLSX;
exports["default"] = _default;
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImluZGV4LnRzIl0sIm5hbWVzIjpbIl92eGV0YWJsZSIsImdldEZvb3RlckNlbGxWYWx1ZSIsIiR0YWJsZSIsIm9wdHMiLCJyb3dzIiwiY29sdW1uIiwiY2VsbFZhbHVlIiwiJGdldENvbHVtbkluZGV4IiwidG9CdWZmZXIiLCJ3Ym91dCIsImJ1ZiIsIkFycmF5QnVmZmVyIiwibGVuZ3RoIiwidmlldyIsIlVpbnQ4QXJyYXkiLCJpbmRleCIsImNoYXJDb2RlQXQiLCJnZXRDZWxsTGFiZWwiLCJjZWxsVHlwZSIsImlzTmFOIiwiTnVtYmVyIiwiZXhwb3J0WExTWCIsInBhcmFtcyIsIm9wdGlvbnMiLCJjb2x1bW5zIiwiZGF0YXMiLCJzaGVldE5hbWUiLCJpc0hlYWRlciIsImlzRm9vdGVyIiwib3JpZ2luYWwiLCJtZXNzYWdlIiwiZm9vdGVyRmlsdGVyTWV0aG9kIiwiY29sSGVhZCIsImZvb3RMaXN0Iiwic2hlZXRDb2xzIiwiZm9yRWFjaCIsImlkIiwicHJvcGVydHkiLCJnZXRUaXRsZSIsInB1c2giLCJ3cHgiLCJYRVV0aWxzIiwidG9JbnRlZ2VyIiwicmVuZGVyV2lkdGgiLCJyb3dMaXN0IiwibWFwIiwiaXRlbSIsImdldFRhYmxlRGF0YSIsImZvb3RlckRhdGEiLCJmb290ZXJzIiwiZmlsdGVyIiwiYm9vayIsIlhMU1giLCJ1dGlscyIsImJvb2tfbmV3Iiwic2hlZXQiLCJqc29uX3RvX3NoZWV0IiwiY29uY2F0Iiwic2tpcEhlYWRlciIsImJvb2tfYXBwZW5kX3NoZWV0Iiwid3JpdGUiLCJib29rVHlwZSIsImJvb2tTU1QiLCJ0eXBlIiwiYmxvYiIsIkJsb2IiLCJkb3dubG9hZEZpbGUiLCJtb2RhbCIsInQiLCJzdGF0dXMiLCJ3aW5kb3ciLCJmaWxlbmFtZSIsIm5hdmlnYXRvciIsIm1zU2F2ZUJsb2IiLCJsaW5rRWxlbSIsImRvY3VtZW50IiwiY3JlYXRlRWxlbWVudCIsInRhcmdldCIsImRvd25sb2FkIiwiaHJlZiIsIlVSTCIsImNyZWF0ZU9iamVjdFVSTCIsImJvZHkiLCJhcHBlbmRDaGlsZCIsImNsaWNrIiwicmVtb3ZlQ2hpbGQiLCJjb25zb2xlIiwiZXJyb3IiLCJyZXBsYWNlRG91YmxlUXVvdGF0aW9uIiwidmFsIiwicmVwbGFjZSIsInBhcnNlQ3N2IiwiY29udGVudCIsImxpc3QiLCJzcGxpdCIsImZpZWxkcyIsInJMaXN0Iiwic2xpY2UiLCJyIiwiY29sSW5kZXgiLCJjaGVja0ltcG9ydERhdGEiLCJ0YWJsZUZpZWxkcyIsImZpZWxkIiwiZXZlcnkiLCJpbmNsdWRlcyIsImltcG9ydFhMU1giLCJmaWxlIiwiX2ltcG9ydFJlc29sdmUiLCJmaWxlUmVhZGVyIiwiRmlsZVJlYWRlciIsIm9ubG9hZCIsImUiLCJ3b3JrYm9vayIsInJlYWQiLCJyZXN1bHQiLCJjc3ZEYXRhIiwic2hlZXRfdG9fY3N2IiwiU2hlZXRzIiwiU2hlZXQxIiwiY3JlYXRlRGF0YSIsInRoZW4iLCJkYXRhIiwibW9kZSIsImluc2VydEF0IiwicmVsb2FkRGF0YSIsInRlbXBsYXRlIiwicmVhZEFzQmluYXJ5U3RyaW5nIiwiaGFuZGxlSW1wb3J0RXZlbnQiLCJoYW5kbGVFeHBvcnRFdmVudCIsIlZYRVRhYmxlUGx1Z2luRXhwb3J0WExTWCIsImluc3RhbGwiLCJ4dGFibGUiLCJpbnRlcmNlcHRvciIsIk9iamVjdCIsImFzc2lnbiIsInR5cGVzIiwieGxzeCIsIm1peGluIiwiVlhFVGFibGUiLCJ1c2UiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7QUFDQTs7QUFTQTs7OztBQVZBOztBQVdBO0FBRUEsSUFBSUEsU0FBSjs7QUFFQSxTQUFTQyxrQkFBVCxDQUE2QkMsTUFBN0IsRUFBNENDLElBQTVDLEVBQWdFQyxJQUFoRSxFQUE2RUMsTUFBN0UsRUFBaUc7QUFDL0YsTUFBTUMsU0FBUyxHQUFHRixJQUFJLENBQUNGLE1BQU0sQ0FBQ0ssZUFBUCxDQUF1QkYsTUFBdkIsQ0FBRCxDQUF0QjtBQUNBLFNBQU9DLFNBQVA7QUFDRDs7QUFFRCxTQUFTRSxRQUFULENBQW1CQyxLQUFuQixF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LElBQUFBLFVBQVUsQ0FBQ0MsTUFBRCxDQUFWO0FBQ0EsV0FBTyxLQUFQO0FBQ0Q7QUFDRjtBQUVEOzs7OztBQUdPLElBQU0yRyx3QkFBd0IsR0FBRztBQUN0Q0MsRUFBQUEsT0FEc0MsbUJBQzdCQyxNQUQ2QixFQUNOO0FBQUEsUUFDdEJDLFdBRHNCLEdBQ05ELE1BRE0sQ0FDdEJDLFdBRHNCO0FBRTlCcEksSUFBQUEsU0FBUyxHQUFHbUksTUFBWjtBQUNBRSxJQUFBQSxNQUFNLENBQUNDLE1BQVAsQ0FBY0gsTUFBTSxDQUFDSSxLQUFyQixFQUE0QjtBQUFFQyxNQUFBQSxJQUFJLEVBQUU7QUFBUixLQUE1QjtBQUNBSixJQUFBQSxXQUFXLENBQUNLLEtBQVosQ0FBa0I7QUFDaEIsc0JBQWdCVixpQkFEQTtBQUVoQixzQkFBZ0JDO0FBRkEsS0FBbEI7QUFJRDtBQVRxQyxDQUFqQzs7O0FBWVAsSUFBSSxPQUFPMUQsTUFBUCxLQUFrQixXQUFsQixJQUFpQ0EsTUFBTSxDQUFDb0UsUUFBNUMsRUFBc0Q7QUFDcERwRSxFQUFBQSxNQUFNLENBQUNvRSxRQUFQLENBQWdCQyxHQUFoQixDQUFvQlYsd0JBQXBCO0FBQ0Q7O2VBRWNBLHdCIiwiZmlsZSI6ImluZGV4LmNvbW1vbi5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qIGVzbGludC1kaXNhYmxlIG5vLXVudXNlZC12YXJzICovXHJcbmltcG9ydCBYRVV0aWxzIGZyb20gJ3hlLXV0aWxzL21ldGhvZHMveGUtdXRpbHMnXHJcbmltcG9ydCB7XHJcbiAgVlhFVGFibGUsXHJcbiAgVGFibGUsXHJcbiAgSW50ZXJjZXB0b3JFeHBvcnRQYXJhbXMsXHJcbiAgSW50ZXJjZXB0b3JJbXBvcnRQYXJhbXMsXHJcbiAgQ29sdW1uQ29uZmlnLFxyXG4gIEV4cG9ydE9wdG9uc1xyXG59IGZyb20gJ3Z4ZS10YWJsZS9saWIvdnhlLXRhYmxlJ1xyXG5pbXBvcnQgWExTWCBmcm9tICd4bHN4J1xyXG4vKiBlc2xpbnQtZW5hYmxlIG5vLXVudXNlZC12YXJzICovXHJcblxyXG5sZXQgX3Z4ZXRhYmxlOiB0eXBlb2YgVlhFVGFibGVcclxuXHJcbmZ1bmN0aW9uIGdldEZvb3RlckNlbGxWYWx1ZSAoJHRhYmxlOiBUYWJsZSwgb3B0czogRXhwb3J0T3B0b25zLCByb3dzOiBhbnlbXSwgY29sdW1uOiBDb2x1bW5Db25maWcpIHtcclxuICBjb25zdCBjZWxsVmFsdWUgPSByb3dzWyR0YWJsZS4kZ2V0Q29sdW1uSW5kZXgoY29sdW1uKV1cclxuICByZXR1cm4gY2VsbFZhbHVlXHJcbn1cclxuXHJcbmZ1bmN0aW9uIHRvQnVmZmVyICh3Ym91dDogYW55KSB7XHJcbiAgY29uc3QgYnVmID0gbmV3IEFycmF5QnVmZmVyKHdib3V0Lmxlbmd0aClcclxuICBjb25zdCB2aWV3ID0gbmV3IFVpbnQ4QXJyYXkoYnVmKVxyXG4gIGZvciAobGV0IGluZGV4ID0gMDsgaW5kZXggIT09IHdib3V0Lmxlbmd0aDsgKytpbmRleCkgdmlld1tpbmRleF0gPSB3Ym91dC5jaGFyQ29kZUF0KGluZGV4KSAmIDB4RkZcclxuICByZXR1cm4gYnVmXHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdldENlbGxMYWJlbCAoY29sdW1uOiBDb2x1bW5Db25maWcsIGNlbGxWYWx1ZTogYW55KSB7XHJcbiAgaWYgKGNlbGxWYWx1ZSkge1xyXG4gICAgc3dpdGNoIChjb2x1bW4uY2VsbFR5cGUpIHtcclxuICAgICAgY2FzZSAnc3RyaW5nJzpcclxuICAgICAgICBicmVha1xyXG4gICAgICBjYXNlICdudW1iZXInOlxyXG4gICAgICAgIGlmICghaXNOYU4oY2VsbFZhbHVlKSkge1xyXG4gICAgICAgICAgcmV0dXJuIE51bWJlcihjZWxsVmFsdWUpXHJcbiAgICAgICAgfVxyXG4gICAgICAgIGJyZWFrXHJcbiAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgaWYgKGNlbGxWYWx1ZS5sZW5ndGggPCAxMiAmJiAhaXNOYU4oY2VsbFZhbHVlKSkge1xyXG4gICAgICAgICAgcmV0dXJuIE51bWJlcihjZWxsVmFsdWUpXHJcbiAgICAgICAgfVxyXG4gICAgICAgIGJyZWFrXHJcbiAgICB9XHJcbiAgfVxyXG4gIHJldHVybiBjZWxsVmFsdWVcclxufVxyXG5cclxuZnVuY3Rpb24gZXhwb3J0WExTWCAocGFyYW1zOiBJbnRlcmNlcHRvckV4cG9ydFBhcmFtcykge1xyXG4gIGNvbnN0IHsgJHRhYmxlLCBvcHRpb25zLCBjb2x1bW5zLCBkYXRhcyB9ID0gcGFyYW1zXHJcbiAgY29uc3QgeyBzaGVldE5hbWUsIGlzSGVhZGVyLCBpc0Zvb3Rlciwgb3JpZ2luYWwsIG1lc3NhZ2UsIGZvb3RlckZpbHRlck1ldGhvZCB9ID0gb3B0aW9uc1xyXG4gIGNvbnN0IGNvbEhlYWQ6IHsgW2tleTogc3RyaW5nXTogYW55IH0gPSB7fVxyXG4gIGNvbnN0IGZvb3RMaXN0OiB7IFtrZXk6IHN0cmluZ106IGFueSB9W10gPSBbXVxyXG4gIGNvbnN0IHNoZWV0Q29sczogYW55W10gPSBbXVxyXG4gIGlmIChpc0hlYWRlcikge1xyXG4gICAgY29sdW1ucy5mb3JFYWNoKChjb2x1bW4pID0+IHtcclxuICAgICAgY29sSGVhZFtjb2x1bW4uaWRdID0gb3JpZ2luYWwgPyBjb2x1bW4ucHJvcGVydHkgOiBjb2x1bW4uZ2V0VGl0bGUoKVxyXG4gICAgICBzaGVldENvbHMucHVzaCh7XHJcbiAgICAgICAgd3B4OiBYRVV0aWxzLnRvSW50ZWdlcihjb2x1bW4ucmVuZGVyV2lkdGggKiAwLjgpXHJcbiAgICAgIH0pXHJcbiAgICB9KVxyXG4gIH1cclxuICBjb25zdCByb3dMaXN0ID0gZGF0YXMubWFwKGl0ZW0gPT4ge1xyXG4gICAgY29sdW1ucy5mb3JFYWNoKChjb2x1bW4pID0+IHtcclxuICAgICAgaXRlbVtjb2x1bW4uaWRdID0gZ2V0Q2VsbExhYmVsKGNvbHVtbiwgaXRlbVtjb2x1bW4uaWRdKVxyXG4gICAgfSlcclxuICAgIHJldHVybiBpdGVtXHJcbiAgfSlcclxuICBpZiAoaXNGb290ZXIpIHtcclxuICAgIGNvbnN0IHsgZm9vdGVyRGF0YSB9ID0gJHRhYmxlLmdldFRhYmxlRGF0YSgpXHJcbiAgICBjb25zdCBmb290ZXJzID0gZm9vdGVyRmlsdGVyTWV0aG9kID8gZm9vdGVyRGF0YS5maWx0ZXIoZm9vdGVyRmlsdGVyTWV0aG9kKSA6IGZvb3RlckRhdGFcclxuICAgIGZvb3RlcnMuZm9yRWFjaCgocm93cykgPT4ge1xyXG4gICAgICBjb25zdCBpdGVtOiB7IFtrZXk6IHN0cmluZ106IGFueSB9ID0ge31cclxuICAgICAgY29sdW1ucy5mb3JFYWNoKChjb2x1bW4pID0+IHtcclxuICAgICAgICBpdGVtW2NvbHVtbi5pZF0gPSBnZXRGb290ZXJDZWxsVmFsdWUoJHRhYmxlLCBvcHRpb25zLCByb3dzLCBjb2x1bW4pXHJcbiAgICAgIH0pXHJcbiAgICAgIGZvb3RMaXN0LnB1c2goaXRlbSlcclxuICAgIH0pXHJcbiAgfVxyXG4gIGNvbnN0IGJvb2sgPSBYTFNYLnV0aWxzLmJvb2tfbmV3KClcclxuICBjb25zdCBzaGVldCA9IFhMU1gudXRpbHMuanNvbl90b19zaGVldCgoaXNIZWFkZXIgPyBbY29sSGVhZF0gOiBbXSkuY29uY2F0KHJvd0xpc3QpLmNvbmNhdChmb290TGlzdCksIHsgc2tpcEhlYWRlcjogdHJ1ZSB9KVxyXG4gIC8vIOWIl+WuvVxyXG4gIHNoZWV0WychY29scyddID0gc2hlZXRDb2xzXHJcbiAgLy8g6L2s5o2i5pWw5o2uXHJcbiAgWExTWC51dGlscy5ib29rX2FwcGVuZF9zaGVldChib29rLCBzaGVldCwgc2hlZXROYW1lKVxyXG4gIGNvbnN0IHdib3V0ID0gWExTWC53cml0ZShib29rLCB7IGJvb2tUeXBlOiAneGxzeCcsIGJvb2tTU1Q6IGZhbHNlLCB0eXBlOiAnYmluYXJ5JyB9KVxyXG4gIGNvbnN0IGJsb2IgPSBuZXcgQmxvYihbdG9CdWZmZXIod2JvdXQpXSwgeyB0eXBlOiAnYXBwbGljYXRpb24vb2N0ZXQtc3RyZWFtJyB9KVxyXG4gIC8vIOS/neWtmOWvvOWHulxyXG4gIGRvd25sb2FkRmlsZShibG9iLCBvcHRpb25zKVxyXG4gIGlmIChtZXNzYWdlICE9PSBmYWxzZSkge1xyXG4gICAgX3Z4ZXRhYmxlLm1vZGFsLm1lc3NhZ2UoeyBtZXNzYWdlOiBfdnhldGFibGUudCgndnhlLnRhYmxlLmV4cFN1Y2Nlc3MnKSwgc3RhdHVzOiAnc3VjY2VzcycgfSlcclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGRvd25sb2FkRmlsZSAoYmxvYjogQmxvYiwgb3B0aW9uczogRXhwb3J0T3B0b25zKSB7XHJcbiAgaWYgKHdpbmRvdy5CbG9iKSB7XHJcbiAgICBjb25zdCB7IGZpbGVuYW1lLCB0eXBlIH0gPSBvcHRpb25zXHJcbiAgICBpZiAobmF2aWdhdG9yLm1zU2F2ZUJsb2IpIHtcclxuICAgICAgbmF2aWdhdG9yLm1zU2F2ZUJsb2IoYmxvYiwgYCR7ZmlsZW5hbWV9LiR7dHlwZX1gKVxyXG4gICAgfSBlbHNlIHtcclxuICAgICAgY29uc3QgbGlua0VsZW0gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdhJylcclxuICAgICAgbGlua0VsZW0udGFyZ2V0ID0gJ19ibGFuaydcclxuICAgICAgbGlua0VsZW0uZG93bmxvYWQgPSBgJHtmaWxlbmFtZX0uJHt0eXBlfWBcclxuICAgICAgbGlua0VsZW0uaHJlZiA9IFVSTC5jcmVhdGVPYmplY3RVUkwoYmxvYilcclxuICAgICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChsaW5rRWxlbSlcclxuICAgICAgbGlua0VsZW0uY2xpY2soKVxyXG4gICAgICBkb2N1bWVudC5ib2R5LnJlbW92ZUNoaWxkKGxpbmtFbGVtKVxyXG4gICAgfVxyXG4gIH0gZWxzZSB7XHJcbiAgICBjb25zb2xlLmVycm9yKF92eGV0YWJsZS50KCd2eGUuZXJyb3Iubm90RXhwJykpXHJcbiAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiByZXBsYWNlRG91YmxlUXVvdGF0aW9uICh2YWw6IHN0cmluZykge1xyXG4gIHJldHVybiB2YWwucmVwbGFjZSgvXlwiLywgJycpLnJlcGxhY2UoL1wiJC8sICcnKVxyXG59XHJcblxyXG5mdW5jdGlvbiBwYXJzZUNzdiAoY29sdW1uczogQ29sdW1uQ29uZmlnW10sIGNvbnRlbnQ6IHN0cmluZykge1xyXG4gIGNvbnN0IGxpc3QgPSBjb250ZW50LnNwbGl0KCdcXG4nKVxyXG4gIGNvbnN0IGZpZWxkczogc3RyaW5nW10gPSBbXVxyXG4gIGNvbnN0IHJvd3M6IGFueVtdID0gW11cclxuICBpZiAobGlzdC5sZW5ndGgpIHtcclxuICAgIGNvbnN0IHJMaXN0ID0gbGlzdC5zbGljZSgxKVxyXG4gICAgbGlzdFswXS5zcGxpdCgnLCcpLm1hcChyZXBsYWNlRG91YmxlUXVvdGF0aW9uKVxyXG4gICAgckxpc3QuZm9yRWFjaCgocikgPT4ge1xyXG4gICAgICBpZiAocikge1xyXG4gICAgICAgIGNvbnN0IGl0ZW06IHsgW2tleTogc3RyaW5nXTogYW55IH0gPSB7fVxyXG4gICAgICAgIHIuc3BsaXQoJywnKS5mb3JFYWNoKCh2YWwsIGNvbEluZGV4KSA9PiB7XHJcbiAgICAgICAgICBpZiAoZmllbGRzW2NvbEluZGV4XSkge1xyXG4gICAgICAgICAgICBpdGVtW2ZpZWxkc1tjb2xJbmRleF1dID0gcmVwbGFjZURvdWJsZVF1b3RhdGlvbih2YWwpXHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfSlcclxuICAgICAgICByb3dzLnB1c2goaXRlbSlcclxuICAgICAgfVxyXG4gICAgfSlcclxuICB9XHJcbiAgcmV0dXJuIHsgZmllbGRzLCByb3dzIH1cclxufVxyXG5cclxuZnVuY3Rpb24gY2hlY2tJbXBvcnREYXRhIChjb2x1bW5zOiBDb2x1bW5Db25maWdbXSwgZmllbGRzOiBzdHJpbmdbXSwgcm93czogYW55W10pIHtcclxuICBjb25zdCB0YWJsZUZpZWxkczogc3RyaW5nW10gPSBbXVxyXG4gIGNvbHVtbnMuZm9yRWFjaCgoY29sdW1uKSA9PiB7XHJcbiAgICBjb25zdCBmaWVsZCA9IGNvbHVtbi5wcm9wZXJ0eVxyXG4gICAgaWYgKGZpZWxkKSB7XHJcbiAgICAgIHRhYmxlRmllbGRzLnB1c2goZmllbGQpXHJcbiAgICB9XHJcbiAgfSlcclxuICByZXR1cm4gdGFibGVGaWVsZHMuZXZlcnkoKGZpZWxkKSA9PiBmaWVsZHMuaW5jbHVkZXMoZmllbGQpKVxyXG59XHJcblxyXG5mdW5jdGlvbiBpbXBvcnRYTFNYIChwYXJhbXM6IEludGVyY2VwdG9ySW1wb3J0UGFyYW1zKSB7XHJcbiAgY29uc3QgeyBjb2x1bW5zLCBvcHRpb25zLCBmaWxlIH0gPSBwYXJhbXNcclxuICBjb25zdCAkdGFibGU6IGFueSA9IHBhcmFtcy4kdGFibGVcclxuICBjb25zdCB7IF9pbXBvcnRSZXNvbHZlIH0gPSAkdGFibGVcclxuICBjb25zdCBmaWxlUmVhZGVyID0gbmV3IEZpbGVSZWFkZXIoKVxyXG4gIGZpbGVSZWFkZXIub25sb2FkID0gKGU6IGFueSkgPT4ge1xyXG4gICAgY29uc3Qgd29ya2Jvb2sgPSBYTFNYLnJlYWQoZS50YXJnZXQucmVzdWx0LCB7IHR5cGU6ICdiaW5hcnknIH0pXHJcbiAgICBjb25zdCBjc3ZEYXRhOiBzdHJpbmcgPSBYTFNYLnV0aWxzLnNoZWV0X3RvX2Nzdih3b3JrYm9vay5TaGVldHMuU2hlZXQxKVxyXG4gICAgY29uc3QgeyBmaWVsZHMsIHJvd3MgfSA9IHBhcnNlQ3N2KGNvbHVtbnMsIGNzdkRhdGEpXHJcbiAgICBjb25zdCBzdGF0dXMgPSBjaGVja0ltcG9ydERhdGEoY29sdW1ucywgZmllbGRzLCByb3dzKVxyXG4gICAgaWYgKHN0YXR1cykge1xyXG4gICAgICAkdGFibGUuY3JlYXRlRGF0YShyb3dzKVxyXG4gICAgICAgIC50aGVuKChkYXRhOiBhbnlbXSkgPT4ge1xyXG4gICAgICAgICAgaWYgKG9wdGlvbnMubW9kZSA9PT0gJ2FwcGVuZCcpIHtcclxuICAgICAgICAgICAgJHRhYmxlLmluc2VydEF0KGRhdGEsIC0xKVxyXG4gICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgJHRhYmxlLnJlbG9hZERhdGEoZGF0YSlcclxuICAgICAgICAgIH1cclxuICAgICAgICB9KVxyXG4gICAgICBpZiAob3B0aW9ucy5tZXNzYWdlICE9PSBmYWxzZSkge1xyXG4gICAgICAgIF92eGV0YWJsZS5tb2RhbC5tZXNzYWdlKHsgbWVzc2FnZTogWEVVdGlscy50ZW1wbGF0ZShfdnhldGFibGUudCgndnhlLnRhYmxlLmltcFN1Y2Nlc3MnKSwgW3Jvd3MubGVuZ3RoXSksIHN0YXR1czogJ3N1Y2Nlc3MnIH0pXHJcbiAgICAgIH1cclxuICAgIH0gZWxzZSBpZiAob3B0aW9ucy5tZXNzYWdlICE9PSBmYWxzZSkge1xyXG4gICAgICBfdnhldGFibGUubW9kYWwubWVzc2FnZSh7IG1lc3NhZ2U6IF92eGV0YWJsZS50KCd2eGUuZXJyb3IuaW1wRmllbGRzJyksIHN0YXR1czogJ2Vycm9yJyB9KVxyXG4gICAgfVxyXG4gICAgaWYgKF9pbXBvcnRSZXNvbHZlKSB7XHJcbiAgICAgIF9pbXBvcnRSZXNvbHZlKHN0YXR1cylcclxuICAgICAgJHRhYmxlLl9pbXBvcnRSZXNvbHZlID0gbnVsbFxyXG4gICAgfVxyXG4gIH1cclxuICBmaWxlUmVhZGVyLnJlYWRBc0JpbmFyeVN0cmluZyhmaWxlKVxyXG59XHJcblxyXG5mdW5jdGlvbiBoYW5kbGVJbXBvcnRFdmVudCAocGFyYW1zOiBJbnRlcmNlcHRvckltcG9ydFBhcmFtcykge1xyXG4gIGlmIChwYXJhbXMub3B0aW9ucy50eXBlID09PSAneGxzeCcpIHtcclxuICAgIGltcG9ydFhMU1gocGFyYW1zKVxyXG4gICAgcmV0dXJuIGZhbHNlXHJcbiAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBoYW5kbGVFeHBvcnRFdmVudCAocGFyYW1zOiBJbnRlcmNlcHRvckV4cG9ydFBhcmFtcykge1xyXG4gIGlmIChwYXJhbXMub3B0aW9ucy50eXBlID09PSAneGxzeCcpIHtcclxuICAgIGV4cG9ydFhMU1gocGFyYW1zKVxyXG4gICAgcmV0dXJuIGZhbHNlXHJcbiAgfVxyXG59XHJcblxyXG4vKipcclxuICog5Z+65LqOIHZ4ZS10YWJsZSDooajmoLznmoTlop7lvLrmj5Lku7bvvIzmlK/mjIHlr7zlh7ogeGxzeCDmoLzlvI9cclxuICovXHJcbmV4cG9ydCBjb25zdCBWWEVUYWJsZVBsdWdpbkV4cG9ydFhMU1ggPSB7XHJcbiAgaW5zdGFsbCAoeHRhYmxlOiB0eXBlb2YgVlhFVGFibGUpIHtcclxuICAgIGNvbnN0IHsgaW50ZXJjZXB0b3IgfSA9IHh0YWJsZVxyXG4gICAgX3Z4ZXRhYmxlID0geHRhYmxlXHJcbiAgICBPYmplY3QuYXNzaWduKHh0YWJsZS50eXBlcywgeyB4bHN4OiAxIH0pXHJcbiAgICBpbnRlcmNlcHRvci5taXhpbih7XHJcbiAgICAgICdldmVudC5pbXBvcnQnOiBoYW5kbGVJbXBvcnRFdmVudCxcclxuICAgICAgJ2V2ZW50LmV4cG9ydCc6IGhhbmRsZUV4cG9ydEV2ZW50XHJcbiAgICB9KVxyXG4gIH1cclxufVxyXG5cclxuaWYgKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnICYmIHdpbmRvdy5WWEVUYWJsZSkge1xyXG4gIHdpbmRvdy5WWEVUYWJsZS51c2UoVlhFVGFibGVQbHVnaW5FeHBvcnRYTFNYKVxyXG59XHJcblxyXG5leHBvcnQgZGVmYXVsdCBWWEVUYWJsZVBsdWdpbkV4cG9ydFhMU1hcclxuIl19
