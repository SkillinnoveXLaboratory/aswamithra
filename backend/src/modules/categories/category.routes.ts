import { Router, Request, Response } from 'express';
import { sendSuccess, sendError } from '../../utils/response';
import { query } from '../../config/db.config';

const router = Router();

function slugifyCategoryName(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

router.get('/categories', async (_req: Request, res: Response) => {
  const result = await query('SELECT * FROM categories ORDER BY name ASC');
  return sendSuccess(res, 200, 'Product categories retrieved', result.rows);
});

router.post('/admin/categories', async (req: Request, res: Response) => {
  const name = req.body.name || 'New Category';
  const newCat = {
    id: 'cat_' + Date.now(),
    name,
    slug: req.body.slug || slugifyCategoryName(name) || 'new-category',
    icon: req.body.icon || '📦',
  };
  await query('INSERT INTO categories (id, name, slug, icon) VALUES ($1,$2,$3,$4)', [
    newCat.id,
    newCat.name,
    newCat.slug,
    newCat.icon,
  ]);
  return sendSuccess(res, 201, 'Category created', newCat);
});

router.get('/categories/:id', async (req: Request, res: Response) => {
  const result = await query('SELECT * FROM categories WHERE id = $1 OR slug = $1 LIMIT 1', [req.params.id]);
  const cat = result.rows[0];
  if (!cat) return sendError(res, 404, 'CATEGORY_NOT_FOUND', 'Category not found');
  return sendSuccess(res, 200, 'Category detail retrieved', cat);
});

router.put('/admin/categories/:id', async (req: Request, res: Response) => {
  const current = await query('SELECT * FROM categories WHERE id = $1 LIMIT 1', [req.params.id]);
  const row = current.rows[0];
  if (!row) return sendError(res, 404, 'CATEGORY_NOT_FOUND', 'Category not found');

  const name = req.body.name !== undefined ? req.body.name : row.name;
  const slug = req.body.slug !== undefined ? req.body.slug || slugifyCategoryName(name) : req.body.name !== undefined ? slugifyCategoryName(name) : row.slug;
  const icon = req.body.icon !== undefined ? req.body.icon : row.icon;

  await query('UPDATE categories SET name = $1, slug = $2, icon = $3 WHERE id = $4', [name, slug, icon, req.params.id]);
  return sendSuccess(res, 200, 'Category updated', { id: req.params.id, name, slug, icon });
});

router.delete('/admin/categories/:id', async (req: Request, res: Response) => {
  await query('DELETE FROM categories WHERE id = $1', [req.params.id]);
  return sendSuccess(res, 200, 'Category deleted', { id: req.params.id });
});

router.get('/units', async (_req: Request, res: Response) => {
  const result = await query('SELECT * FROM units ORDER BY label ASC');
  return sendSuccess(res, 200, 'Measurement units retrieved', result.rows);
});

router.post('/admin/units', async (req: Request, res: Response) => {
  const newUnit = {
    id: 'unit_' + Date.now(),
    code: req.body.code || 'box',
    label: req.body.label || 'Box',
  };
  await query('INSERT INTO units (id, code, label) VALUES ($1,$2,$3)', [newUnit.id, newUnit.code, newUnit.label]);
  return sendSuccess(res, 201, 'Measurement unit created', newUnit);
});

router.get('/units/:id', async (req: Request, res: Response) => {
  const result = await query('SELECT * FROM units WHERE id = $1 OR code = $1 LIMIT 1', [req.params.id]);
  const unit = result.rows[0];
  if (!unit) return sendError(res, 404, 'UNIT_NOT_FOUND', 'Unit not found');
  return sendSuccess(res, 200, 'Unit detail retrieved', unit);
});

router.put('/admin/units/:id', async (req: Request, res: Response) => {
  const current = await query('SELECT * FROM units WHERE id = $1 LIMIT 1', [req.params.id]);
  const row = current.rows[0];
  if (!row) return sendError(res, 404, 'UNIT_NOT_FOUND', 'Unit not found');

  const code = req.body.code !== undefined ? req.body.code : row.code;
  const label = req.body.label !== undefined ? req.body.label : row.label;

  await query('UPDATE units SET code = $1, label = $2 WHERE id = $3', [code, label, req.params.id]);
  return sendSuccess(res, 200, 'Unit updated', { id: req.params.id, code, label });
});

router.delete('/admin/units/:id', async (req: Request, res: Response) => {
  await query('DELETE FROM units WHERE id = $1', [req.params.id]);
  return sendSuccess(res, 200, 'Unit deleted', { id: req.params.id });
});

export default router;
