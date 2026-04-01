import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../../services/api'

export const fetchAll = createAsyncThunk('payroll/fetchAll', async (params, { rejectWithValue }) => {
  try {
    const res = await api.get('/payroll/contracts', { params })
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch payroll contracts')
  }
})

export const fetchById = createAsyncThunk('payroll/fetchById', async (id, { rejectWithValue }) => {
  try {
    const res = await api.get(`/payroll/contracts/${id}`)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch payroll contract')
  }
})

export const create = createAsyncThunk('payroll/create', async (data, { rejectWithValue }) => {
  try {
    const res = await api.post('/payroll/contracts', data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to create payroll contract')
  }
})

export const update = createAsyncThunk('payroll/update', async ({ id, data }, { rejectWithValue }) => {
  try {
    const res = await api.put(`/payroll/contracts/${id}`, data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to update payroll contract')
  }
})

export const remove = createAsyncThunk('payroll/remove', async (id, { rejectWithValue }) => {
  try {
    await api.delete(`/payroll/contracts/${id}`)
    return id
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to delete payroll contract')
  }
})

export const fetchPayslips = createAsyncThunk('payroll/fetchPayslips', async (params, { rejectWithValue }) => {
  try {
    const res = await api.get('/payroll/payslips', { params })
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch payslips')
  }
})

export const fetchPayslipById = createAsyncThunk('payroll/fetchPayslipById', async (id, { rejectWithValue }) => {
  try {
    const res = await api.get(`/payroll/payslips/${id}`)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch payslip')
  }
})

export const fetchEmployeePayslips = createAsyncThunk('payroll/fetchEmployeePayslips', async (employeeId, { rejectWithValue }) => {
  try {
    const res = await api.get(`/payroll/employee/${employeeId}/payslips`)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch employee payslips')
  }
})

export const confirmPayslip = createAsyncThunk('payroll/confirmPayslip', async (id, { rejectWithValue }) => {
  try {
    const res = await api.post(`/payroll/payslips/${id}/confirm`)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to confirm payslip')
  }
})

export const markPaid = createAsyncThunk('payroll/markPaid', async (id, { rejectWithValue }) => {
  try {
    const res = await api.post(`/payroll/payslips/${id}/mark-paid`)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to mark payslip as paid')
  }
})

export const fetchFilingStatuses = createAsyncThunk('payroll/fetchFilingStatuses', async (_, { rejectWithValue }) => {
  try {
    const res = await api.get('/payroll/filing-statuses')
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch filing statuses')
  }
})

export const createFilingStatus = createAsyncThunk('payroll/createFilingStatus', async (data, { rejectWithValue }) => {
  try {
    const res = await api.post('/payroll/filing-statuses', data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to create filing status')
  }
})

export const updateFilingStatus = createAsyncThunk('payroll/updateFilingStatus', async ({ id, data }, { rejectWithValue }) => {
  try {
    const res = await api.put(`/payroll/filing-statuses/${id}`, data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to update filing status')
  }
})

export const deleteFilingStatus = createAsyncThunk('payroll/deleteFilingStatus', async (id, { rejectWithValue }) => {
  try {
    await api.delete(`/payroll/filing-statuses/${id}`)
    return id
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to delete filing status')
  }
})

export const fetchTaxBrackets = createAsyncThunk('payroll/fetchTaxBrackets', async (filingStatusId, { rejectWithValue }) => {
  try {
    const res = await api.get('/payroll/tax-brackets', { params: { filingStatusId } })
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch tax brackets')
  }
})

export const createTaxBracket = createAsyncThunk('payroll/createTaxBracket', async (data, { rejectWithValue }) => {
  try {
    const res = await api.post('/payroll/tax-brackets', data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to create tax bracket')
  }
})

export const updateTaxBracket = createAsyncThunk('payroll/updateTaxBracket', async ({ id, data }, { rejectWithValue }) => {
  try {
    const res = await api.put(`/payroll/tax-brackets/${id}`, data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to update tax bracket')
  }
})

export const deleteTaxBracket = createAsyncThunk('payroll/deleteTaxBracket', async (id, { rejectWithValue }) => {
  try {
    await api.delete(`/payroll/tax-brackets/${id}`)
    return id
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to delete tax bracket')
  }
})

export const fetchLoans = createAsyncThunk('payroll/fetchLoans', async (_, { rejectWithValue }) => {
  try {
    const res = await api.get('/payroll/loans')
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch loans')
  }
})

export const createLoan = createAsyncThunk('payroll/createLoan', async (data, { rejectWithValue }) => {
  try {
    const res = await api.post('/payroll/loans', data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to create loan')
  }
})

export const settleLoan = createAsyncThunk('payroll/settleLoan', async (id, { rejectWithValue }) => {
  try {
    const res = await api.post(`/payroll/loans/${id}/settle`)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to settle loan')
  }
})

export const fetchReimbursements = createAsyncThunk('payroll/fetchReimbursements', async (_, { rejectWithValue }) => {
  try {
    const res = await api.get('/payroll/reimbursements')
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch reimbursements')
  }
})

export const createReimbursement = createAsyncThunk('payroll/createReimbursement', async (data, { rejectWithValue }) => {
  try {
    const res = await api.post('/payroll/reimbursements', data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to create reimbursement')
  }
})

export const approveReimbursement = createAsyncThunk('payroll/approveReimbursement', async (id, { rejectWithValue }) => {
  try {
    const res = await api.post(`/payroll/reimbursements/${id}/approve`)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to approve reimbursement')
  }
})

export const rejectReimbursement = createAsyncThunk('payroll/rejectReimbursement', async (id, { rejectWithValue }) => {
  try {
    const res = await api.post(`/payroll/reimbursements/${id}/reject`)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to reject reimbursement')
  }
})

// ─── Reimbursement Attachments ──────────────────────────────────────────────

export const fetchReimbursementAttachments = createAsyncThunk('payroll/fetchReimbursementAttachments', async (reimbursementId, { rejectWithValue }) => {
  try { const res = await api.get(`/payroll/reimbursements/${reimbursementId}/attachments`); return res.data }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed') }
})

export const addReimbursementAttachment = createAsyncThunk('payroll/addReimbursementAttachment', async ({ reimbursementId, data }, { rejectWithValue }) => {
  try { const res = await api.post(`/payroll/reimbursements/${reimbursementId}/attachments`, data); return res.data }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed') }
})

export const deleteReimbursementAttachment = createAsyncThunk('payroll/deleteReimbursementAttachment', async (id, { rejectWithValue }) => {
  try { await api.delete(`/payroll/reimbursements/attachments/${id}`); return id }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed') }
})

// ─── Reimbursement Comments ──────────────────────────────────────────────────

export const fetchReimbursementComments = createAsyncThunk('payroll/fetchReimbursementComments', async (reimbursementId, { rejectWithValue }) => {
  try { const res = await api.get(`/payroll/reimbursements/${reimbursementId}/comments`); return res.data }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed') }
})

export const addReimbursementComment = createAsyncThunk('payroll/addReimbursementComment', async ({ reimbursementId, comment }, { rejectWithValue }) => {
  try { const res = await api.post(`/payroll/reimbursements/${reimbursementId}/comments`, { comment }); return res.data }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed') }
})

export const deleteReimbursementComment = createAsyncThunk('payroll/deleteReimbursementComment', async (id, { rejectWithValue }) => {
  try { await api.delete(`/payroll/reimbursements/comments/${id}`); return id }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed') }
})

// ─── Payroll General Settings ────────────────────────────────────────────────

export const fetchPayrollGeneralSettings = createAsyncThunk('payroll/fetchPayrollGeneralSettings', async (companyId, { rejectWithValue }) => {
  try { const res = await api.get('/payroll/general-settings', { params: { companyId } }); return res.data }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed') }
})

export const upsertPayrollGeneralSettings = createAsyncThunk('payroll/upsertPayrollGeneralSettings', async ({ companyId, data }, { rejectWithValue }) => {
  try { const res = await api.put('/payroll/general-settings', data, { params: { companyId } }); return res.data }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed') }
})

// ─── Encashment Settings ─────────────────────────────────────────────────────

export const fetchEncashmentSettings = createAsyncThunk('payroll/fetchEncashmentSettings', async (companyId, { rejectWithValue }) => {
  try { const res = await api.get('/payroll/encashment-settings', { params: { companyId } }); return res.data }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed') }
})

export const upsertEncashmentSettings = createAsyncThunk('payroll/upsertEncashmentSettings', async ({ companyId, data }, { rejectWithValue }) => {
  try { const res = await api.put('/payroll/encashment-settings', data, { params: { companyId } }); return res.data }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed') }
})

// ─── Payslip Auto-Generate ───────────────────────────────────────────────────

export const fetchPayslipAutoGenerate = createAsyncThunk('payroll/fetchPayslipAutoGenerate', async (companyId, { rejectWithValue }) => {
  try { const res = await api.get('/payroll/payslip-auto-generate', { params: { companyId } }); return res.data }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed') }
})

export const upsertPayslipAutoGenerate = createAsyncThunk('payroll/upsertPayslipAutoGenerate', async ({ companyId, data }, { rejectWithValue }) => {
  try { const res = await api.put('/payroll/payslip-auto-generate', data, { params: { companyId } }); return res.data }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed') }
})

// ─── Multiple Conditions ─────────────────────────────────────────────────────

export const generatePayslip = createAsyncThunk('payroll/generatePayslip', async (params, { rejectWithValue }) => {
  try {
    const res = await api.post('/payroll/payslips/generate', null, { params })
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Payslip generation failed')
  }
})

export const generateBulkPayslips = createAsyncThunk('payroll/generateBulkPayslips', async (params, { rejectWithValue }) => {
  try {
    const res = await api.post('/payroll/payslips/generate/bulk', null, { params })
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Bulk generation failed')
  }
})

export const fetchConditions = createAsyncThunk('payroll/fetchConditions', async (params, { rejectWithValue }) => {
  try { const res = await api.get('/payroll/conditions', { params }); return res.data }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed') }
})

export const createCondition = createAsyncThunk('payroll/createCondition', async (data, { rejectWithValue }) => {
  try { const res = await api.post('/payroll/conditions', data); return res.data }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed') }
})

export const updateCondition = createAsyncThunk('payroll/updateCondition', async ({ id, data }, { rejectWithValue }) => {
  try { const res = await api.put(`/payroll/conditions/${id}`, data); return res.data }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed') }
})

export const deleteCondition = createAsyncThunk('payroll/deleteCondition', async (id, { rejectWithValue }) => {
  try { await api.delete(`/payroll/conditions/${id}`); return id }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed') }
})

// ─── Allowances ───────────────────────────────────────────────────────────────

export const fetchAllowances = createAsyncThunk('payroll/fetchAllowances', async (_, { rejectWithValue }) => {
  try { const res = await api.get('/payroll/allowances'); return res.data }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed') }
})

export const createAllowance = createAsyncThunk('payroll/createAllowance', async (data, { rejectWithValue }) => {
  try { const res = await api.post('/payroll/allowances', data); return res.data }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed') }
})

export const updateAllowance = createAsyncThunk('payroll/updateAllowance', async ({ id, data }, { rejectWithValue }) => {
  try { const res = await api.put(`/payroll/allowances/${id}`, data); return res.data }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed') }
})

export const deleteAllowance = createAsyncThunk('payroll/deleteAllowance', async (id, { rejectWithValue }) => {
  try { await api.delete(`/payroll/allowances/${id}`); return id }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed') }
})

// ─── Deductions ───────────────────────────────────────────────────────────────

export const fetchDeductions = createAsyncThunk('payroll/fetchDeductions', async (_, { rejectWithValue }) => {
  try { const res = await api.get('/payroll/deductions'); return res.data }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed') }
})

export const createDeduction = createAsyncThunk('payroll/createDeduction', async (data, { rejectWithValue }) => {
  try { const res = await api.post('/payroll/deductions', data); return res.data }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed') }
})

export const updateDeduction = createAsyncThunk('payroll/updateDeduction', async ({ id, data }, { rejectWithValue }) => {
  try { const res = await api.put(`/payroll/deductions/${id}`, data); return res.data }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed') }
})

export const deleteDeduction = createAsyncThunk('payroll/deleteDeduction', async (id, { rejectWithValue }) => {
  try { await api.delete(`/payroll/deductions/${id}`); return id }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed') }
})

export const sendPayslipEmail = createAsyncThunk('payroll/sendPayslipEmail', async (id, { rejectWithValue }) => {
  try { const res = await api.post(`/payroll/payslips/${id}/send-email`); return res.data }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed to send email') }
})

export const deleteLoan = createAsyncThunk('payroll/deleteLoan', async (id, { rejectWithValue }) => {
  try { await api.delete(`/payroll/loans/${id}`); return id }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed to delete loan') }
})

export const fetchBatchGroups = createAsyncThunk('payroll/fetchBatchGroups', async (_, { rejectWithValue }) => {
  try { const res = await api.get('/payroll/batch-groups'); return res.data }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed') }
})

export const createBatchGroup = createAsyncThunk('payroll/createBatchGroup', async (data, { rejectWithValue }) => {
  try { const res = await api.post('/payroll/batch-groups', data); return res.data }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed') }
})

export const updateBatchGroup = createAsyncThunk('payroll/updateBatchGroup', async ({ id, data }, { rejectWithValue }) => {
  try { const res = await api.put(`/payroll/batch-groups/${id}`, data); return res.data }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed') }
})

export const deleteBatchGroup = createAsyncThunk('payroll/deleteBatchGroup', async (id, { rejectWithValue }) => {
  try { await api.delete(`/payroll/batch-groups/${id}`); return id }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed') }
})

export const fetchPayrollDashboard = createAsyncThunk('payroll/fetchDashboard', async (params, { rejectWithValue }) => {
  try { const res = await api.get('/payroll/dashboard', { params }); return res.data }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed') }
})

export const exportPayslipsExcel = createAsyncThunk('payroll/exportPayslipsExcel', async (filters = {}, { rejectWithValue }) => {
  try {
    const params = {}
    if (filters.status) params.status = filters.status
    if (filters.startDate) params.startDate = filters.startDate
    if (filters.endDate) params.endDate = filters.endDate
    if (filters.employeeId) params.employeeId = filters.employeeId

    const res = await api.get('/payroll/payslips/export/excel', { params, responseType: 'blob' })
    const url = window.URL.createObjectURL(new Blob([res.data]))
    const link = document.createElement('a')
    link.href = url
    const today = new Date().toISOString().slice(0, 10)
    link.setAttribute('download', `Payslip_export_${today}.xlsx`)
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
    return true
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to export payslips')
  }
})

const payrollSlice = createSlice({
  name: 'payroll',
  initialState: {
    contracts: [],
    payslips: [],
    filingStatuses: [],
    taxBrackets: [],
    loans: [],
    reimbursements: [],
    reimbursementAttachments: [],
    reimbursementComments: [],
    payrollGeneralSettings: null,
    encashmentSettings: null,
    payslipAutoGenerate: null,
    conditions: [],
    allowances: [],
    deductions: [],
    batchGroups: [],
    payrollDashboard: null,
    selected: {},
    pagination: { page: 0, size: 20, total: 0 },
    loading: false,
    exportingExcel: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAll.pending, (state) => { state.loading = true; state.error = null })
      .addCase(fetchAll.fulfilled, (state, action) => {
        state.loading = false
        state.contracts = action.payload.content || action.payload
        if (action.payload.totalElements !== undefined) {
          state.pagination.total = action.payload.totalElements
          state.pagination.page = action.payload.number ?? state.pagination.page
          state.pagination.size = action.payload.size ?? state.pagination.size
        }
      })
      .addCase(fetchAll.rejected, (state, action) => { state.loading = false; state.error = action.payload })

      .addCase(fetchById.pending, (state) => { state.loading = true; state.error = null })
      .addCase(fetchById.fulfilled, (state, action) => { state.loading = false; state.selected = action.payload })
      .addCase(fetchById.rejected, (state, action) => { state.loading = false; state.error = action.payload })

      .addCase(create.pending, (state) => { state.loading = true; state.error = null })
      .addCase(create.fulfilled, (state, action) => { state.loading = false; state.contracts.push(action.payload) })
      .addCase(create.rejected, (state, action) => { state.loading = false; state.error = action.payload })

      .addCase(update.pending, (state) => { state.loading = true; state.error = null })
      .addCase(update.fulfilled, (state, action) => {
        state.loading = false
        const idx = state.contracts.findIndex((item) => item.id === action.payload.id)
        if (idx !== -1) state.contracts[idx] = action.payload
        if (state.selected?.id === action.payload.id) state.selected = action.payload
      })
      .addCase(update.rejected, (state, action) => { state.loading = false; state.error = action.payload })

      .addCase(remove.pending, (state) => { state.loading = true; state.error = null })
      .addCase(remove.fulfilled, (state, action) => {
        state.loading = false
        state.contracts = state.contracts.filter((item) => item.id !== action.payload)
      })
      .addCase(remove.rejected, (state, action) => { state.loading = false; state.error = action.payload })

      .addCase(fetchPayslips.pending, (state) => { state.loading = true; state.error = null })
      .addCase(fetchPayslips.fulfilled, (state, action) => {
        state.loading = false
        state.payslips = action.payload.content || action.payload
      })
      .addCase(fetchPayslips.rejected, (state, action) => { state.loading = false; state.error = action.payload })

      .addCase(fetchPayslipById.pending, (state) => { state.loading = true; state.error = null })
      .addCase(fetchPayslipById.fulfilled, (state, action) => { state.loading = false; state.selected = action.payload })
      .addCase(fetchPayslipById.rejected, (state, action) => { state.loading = false; state.error = action.payload })

      .addCase(fetchEmployeePayslips.pending, (state) => { state.loading = true; state.error = null })
      .addCase(fetchEmployeePayslips.fulfilled, (state, action) => {
        state.loading = false
        state.payslips = action.payload.content || action.payload
      })
      .addCase(fetchEmployeePayslips.rejected, (state, action) => { state.loading = false; state.error = action.payload })

      .addCase(confirmPayslip.pending, (state) => { state.loading = true; state.error = null })
      .addCase(confirmPayslip.fulfilled, (state, action) => {
        state.loading = false
        const idx = state.payslips.findIndex((item) => item.id === action.payload.id)
        if (idx !== -1) state.payslips[idx] = action.payload
      })
      .addCase(confirmPayslip.rejected, (state, action) => { state.loading = false; state.error = action.payload })

      .addCase(markPaid.pending, (state) => { state.loading = true; state.error = null })
      .addCase(markPaid.fulfilled, (state, action) => {
        state.loading = false
        const idx = state.payslips.findIndex((item) => item.id === action.payload.id)
        if (idx !== -1) state.payslips[idx] = action.payload
      })
      .addCase(markPaid.rejected, (state, action) => { state.loading = false; state.error = action.payload })

      .addCase(fetchFilingStatuses.pending, (state) => { state.loading = true; state.error = null })
      .addCase(fetchFilingStatuses.fulfilled, (state, action) => { state.loading = false; state.filingStatuses = action.payload.content || action.payload })
      .addCase(fetchFilingStatuses.rejected, (state, action) => { state.loading = false; state.error = action.payload })

      .addCase(createFilingStatus.fulfilled, (state, action) => { state.loading = false; state.filingStatuses.push(action.payload) })
      .addCase(updateFilingStatus.fulfilled, (state, action) => {
        state.loading = false
        const idx = state.filingStatuses.findIndex(f => f.id === action.payload.id)
        if (idx !== -1) state.filingStatuses[idx] = action.payload
      })
      .addCase(deleteFilingStatus.fulfilled, (state, action) => {
        state.loading = false
        state.filingStatuses = state.filingStatuses.filter(f => f.id !== action.payload)
      })

      .addCase(fetchTaxBrackets.pending, (state) => { state.loading = true; state.error = null })
      .addCase(fetchTaxBrackets.fulfilled, (state, action) => { state.loading = false; state.taxBrackets = action.payload.content || action.payload })
      .addCase(fetchTaxBrackets.rejected, (state, action) => { state.loading = false; state.error = action.payload })

      .addCase(createTaxBracket.fulfilled, (state, action) => { state.loading = false; state.taxBrackets.push(action.payload) })
      .addCase(updateTaxBracket.fulfilled, (state, action) => {
        state.loading = false
        const idx = state.taxBrackets.findIndex(b => b.id === action.payload.id)
        if (idx !== -1) state.taxBrackets[idx] = action.payload
      })
      .addCase(deleteTaxBracket.fulfilled, (state, action) => {
        state.loading = false
        state.taxBrackets = state.taxBrackets.filter(b => b.id !== action.payload)
      })

      .addCase(fetchLoans.pending, (state) => { state.loading = true; state.error = null })
      .addCase(fetchLoans.fulfilled, (state, action) => { state.loading = false; state.loans = action.payload.content || action.payload })
      .addCase(fetchLoans.rejected, (state, action) => { state.loading = false; state.error = action.payload })

      .addCase(createLoan.fulfilled, (state, action) => { state.loading = false; state.loans.unshift(action.payload) })
      .addCase(settleLoan.fulfilled, (state, action) => {
        state.loading = false
        const idx = state.loans.findIndex(l => l.id === action.payload.id)
        if (idx !== -1) state.loans[idx] = action.payload
      })

      .addCase(fetchReimbursements.pending, (state) => { state.loading = true; state.error = null })
      .addCase(fetchReimbursements.fulfilled, (state, action) => { state.loading = false; state.reimbursements = action.payload.content || action.payload })
      .addCase(fetchReimbursements.rejected, (state, action) => { state.loading = false; state.error = action.payload })

      .addCase(createReimbursement.fulfilled, (state, action) => { state.loading = false; state.reimbursements.unshift(action.payload) })
      .addCase(approveReimbursement.fulfilled, (state, action) => {
        state.loading = false
        const idx = state.reimbursements.findIndex(r => r.id === action.payload.id)
        if (idx !== -1) state.reimbursements[idx] = action.payload
      })
      .addCase(rejectReimbursement.fulfilled, (state, action) => {
        state.loading = false
        const idx = state.reimbursements.findIndex(r => r.id === action.payload.id)
        if (idx !== -1) state.reimbursements[idx] = action.payload
      })

      .addCase(fetchReimbursementAttachments.fulfilled, (state, action) => { state.reimbursementAttachments = action.payload })
      .addCase(addReimbursementAttachment.fulfilled, (state, action) => { state.reimbursementAttachments.push(action.payload) })
      .addCase(deleteReimbursementAttachment.fulfilled, (state, action) => { state.reimbursementAttachments = state.reimbursementAttachments.filter(a => a.id !== action.payload) })

      .addCase(fetchReimbursementComments.fulfilled, (state, action) => { state.reimbursementComments = action.payload })
      .addCase(addReimbursementComment.fulfilled, (state, action) => { state.reimbursementComments.push(action.payload) })
      .addCase(deleteReimbursementComment.fulfilled, (state, action) => { state.reimbursementComments = state.reimbursementComments.filter(c => c.id !== action.payload) })

      .addCase(fetchPayrollGeneralSettings.fulfilled, (state, action) => { state.payrollGeneralSettings = action.payload })
      .addCase(upsertPayrollGeneralSettings.fulfilled, (state, action) => { state.payrollGeneralSettings = action.payload })

      .addCase(fetchEncashmentSettings.fulfilled, (state, action) => { state.encashmentSettings = action.payload })
      .addCase(upsertEncashmentSettings.fulfilled, (state, action) => { state.encashmentSettings = action.payload })

      .addCase(fetchPayslipAutoGenerate.fulfilled, (state, action) => { state.payslipAutoGenerate = action.payload })
      .addCase(upsertPayslipAutoGenerate.fulfilled, (state, action) => { state.payslipAutoGenerate = action.payload })

      .addCase(generatePayslip.pending, (state) => { state.loading = true })
      .addCase(generatePayslip.fulfilled, (state, action) => {
        state.loading = false
        state.payslips.unshift(action.payload)
      })
      .addCase(generatePayslip.rejected, (state, action) => { state.loading = false; state.error = action.payload })

      .addCase(generateBulkPayslips.pending, (state) => { state.loading = true })
      .addCase(generateBulkPayslips.fulfilled, (state, action) => {
        state.loading = false
        state.payslips = [...(action.payload || []), ...state.payslips]
      })
      .addCase(generateBulkPayslips.rejected, (state, action) => { state.loading = false; state.error = action.payload })

      .addCase(fetchConditions.fulfilled, (state, action) => { state.conditions = action.payload })
      .addCase(createCondition.fulfilled, (state, action) => { state.conditions.push(action.payload) })
      .addCase(updateCondition.fulfilled, (state, action) => {
        const idx = state.conditions.findIndex(c => c.id === action.payload.id)
        if (idx !== -1) state.conditions[idx] = action.payload
      })
      .addCase(deleteCondition.fulfilled, (state, action) => { state.conditions = state.conditions.filter(c => c.id !== action.payload) })

      .addCase(fetchAllowances.fulfilled, (state, action) => { state.allowances = action.payload.content || action.payload })
      .addCase(createAllowance.fulfilled, (state, action) => { state.allowances.unshift(action.payload) })
      .addCase(updateAllowance.fulfilled, (state, action) => {
        const idx = state.allowances.findIndex(a => a.id === action.payload.id)
        if (idx !== -1) state.allowances[idx] = action.payload
      })
      .addCase(deleteAllowance.fulfilled, (state, action) => { state.allowances = state.allowances.filter(a => a.id !== action.payload) })

      .addCase(fetchDeductions.fulfilled, (state, action) => { state.deductions = action.payload.content || action.payload })
      .addCase(createDeduction.fulfilled, (state, action) => { state.deductions.unshift(action.payload) })
      .addCase(updateDeduction.fulfilled, (state, action) => {
        const idx = state.deductions.findIndex(d => d.id === action.payload.id)
        if (idx !== -1) state.deductions[idx] = action.payload
      })
      .addCase(deleteDeduction.fulfilled, (state, action) => { state.deductions = state.deductions.filter(d => d.id !== action.payload) })

      .addCase(exportPayslipsExcel.pending, (state) => { state.exportingExcel = true })
      .addCase(exportPayslipsExcel.fulfilled, (state) => { state.exportingExcel = false })
      .addCase(exportPayslipsExcel.rejected, (state) => { state.exportingExcel = false })

      .addCase(fetchBatchGroups.fulfilled, (state, action) => { state.batchGroups = action.payload })
      .addCase(createBatchGroup.fulfilled, (state, action) => { state.batchGroups.push(action.payload) })
      .addCase(updateBatchGroup.fulfilled, (state, action) => {
        const idx = state.batchGroups.findIndex(g => g.id === action.payload.id)
        if (idx !== -1) state.batchGroups[idx] = action.payload
      })
      .addCase(deleteBatchGroup.fulfilled, (state, action) => {
        state.batchGroups = state.batchGroups.filter(g => g.id !== action.payload)
      })
      .addCase(fetchPayrollDashboard.fulfilled, (state, action) => { state.payrollDashboard = action.payload })
      .addCase(deleteLoan.fulfilled, (state, action) => {
        if (state.loans) state.loans = state.loans.filter(l => l.id !== action.payload)
      })
  },
})

export const selectAll = (state) => state.payroll.contracts
export const selectSelected = (state) => state.payroll.selected
export const selectLoading = (state) => state.payroll.loading
export const selectPagination = (state) => state.payroll.pagination
export const selectPayslips = (state) => state.payroll.payslips
export const selectFilingStatuses = (state) => state.payroll.filingStatuses
export const selectTaxBrackets = (state) => state.payroll.taxBrackets
export const selectLoans = (state) => state.payroll.loans
export const selectReimbursements = (state) => state.payroll.reimbursements
export const selectReimbursementAttachments = (state) => state.payroll.reimbursementAttachments
export const selectReimbursementComments = (state) => state.payroll.reimbursementComments
export const selectPayrollGeneralSettings = (state) => state.payroll.payrollGeneralSettings
export const selectEncashmentSettings = (state) => state.payroll.encashmentSettings
export const selectPayslipAutoGenerate = (state) => state.payroll.payslipAutoGenerate
export const selectConditions = (state) => state.payroll.conditions
export const selectAllowances = (state) => state.payroll.allowances
export const selectDeductions = (state) => state.payroll.deductions
export const selectExportingExcel = (state) => state.payroll.exportingExcel
export default payrollSlice.reducer
