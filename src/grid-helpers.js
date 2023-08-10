const numberValueParser = (params) => Number(params.newValue);

const numberCellFormatter = (params) =>
{
    if (!params || !params.value) {
        return '';
    }

    return params.value.toFixed(2).replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,');
}

const currencyCellFormatter = (params) => '$' + numberCellFormatter(params);

export const numCol = (column, currency = false) =>
{
    column.resizable = true;
    column.valueParser = numberValueParser;
    column.cellClass = 'right';
    column.valueFormatter = currency ? currencyCellFormatter : numberCellFormatter;
    column.cellRenderer = 'agAnimateShowChangeCellRenderer';
    return column;
};

export const curCol = (column) => numCol(column, true);

export const withSelect = (columnDefs, options = '') => (`${options}${options ? ',' : ''}select=[-/,${columnDefs.map(c => '+/' + c.field).join(',')}]`);

export const generateOrderBy = columns => (
    columns
        .filter(({ sort }) => sort !== null)
        .sort(({ sortIndex: si1 }, { sortIndex: si2 }) => si1 - si2)
        .map(({ colId, sort }) => `/${colId} ${sort}`)
        .join(',')
);
