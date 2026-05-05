import '../src/index.js';
import type { ColumnConfig } from '../src/types.js';

interface Employee {
  id: number;
  name: string;
  department: string;
  salary: number;
  startDate: string;
  status: 'active' | 'inactive';
}

const data: Employee[] = [
  { id: 1, name: 'Alice Chen', department: 'Engineering', salary: 95000, startDate: '2021-03-15', status: 'active' },
  { id: 2, name: 'Bob Martinez', department: 'Design', salary: 78000, startDate: '2020-07-01', status: 'active' },
  { id: 3, name: 'Charlie Kim', department: 'Engineering', salary: 102000, startDate: '2019-11-20', status: 'active' },
  { id: 4, name: 'Diana Patel', department: 'Marketing', salary: 72000, startDate: '2022-01-10', status: 'inactive' },
  { id: 5, name: 'Erik Johnson', department: 'Engineering', salary: 88000, startDate: '2021-09-05', status: 'active' },
  { id: 6, name: 'Fiona Lee', department: 'HR', salary: 65000, startDate: '2018-04-22', status: 'active' },
  { id: 7, name: 'George Wu', department: 'Engineering', salary: 115000, startDate: '2017-06-30', status: 'active' },
  { id: 8, name: 'Hannah Brown', department: 'Design', salary: 82000, startDate: '2023-02-14', status: 'inactive' },
  { id: 9, name: 'Ivan Torres', department: 'Marketing', salary: 69000, startDate: '2022-08-03', status: 'active' },
  { id: 10, name: 'Julia Adams', department: 'Engineering', salary: 98000, startDate: '2020-12-18', status: 'active' },
  { id: 11, name: 'Kevin Park', department: 'Design', salary: 85000, startDate: '2021-06-01', status: 'active' },
  { id: 12, name: 'Laura White', department: 'HR', salary: 60000, startDate: '2019-03-15', status: 'inactive' },
];

const columns: ColumnConfig<Employee>[] = [
  { control: 'dv-text', field: 'name', title: 'Name', sortable: true, filterable: true },
  { control: 'dv-text', field: 'department', title: 'Department', sortable: true, filterable: true },
  { control: 'dv-number', field: 'salary', title: 'Salary', sortable: true },
  { control: 'dv-date', field: 'startDate', title: 'Start Date', sortable: true },
  {
    control: 'dv-badge',
    field: 'status',
    title: 'Status',
    params: { color: '' },
    disable: (row) => row.status === 'inactive',
  },
];

const view = document.querySelector('data-view') as HTMLElement & {
  data: Employee[];
  columns: ColumnConfig<Employee>[];
};

view.data = data;
view.columns = columns;
