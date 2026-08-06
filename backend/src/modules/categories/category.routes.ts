import { Router, Request, Response } from 'express';
import { sendSuccess, sendError } from '../../utils/response';
import { db, Category, Unit } from '../../store/db.store';

const router = Router();

function slugifyCategoryName(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// Categories CRUD (Reading & Mutating db.categories directly)
router.get('/categories', (req: Request, res: Response) => {
  return sendSuccess(res, 200, 'Product categories retrieved', db.categories);
});

router.post('/admin/categories', (req: Request, res: Response) => {
  const name = req.body.name || 'New Category';
  const newCat: Category = {
    id: 'cat_' + Date.now(),
    name,
    slug: req.body.slug || slugifyCategoryName(name) || 'new-category',
    icon: req.body.icon || '📦',
  };
  db.categories.push(newCat);
  return sendSuccess(res, 201, 'Category created', newCat);
});

router.get('/categories/:id', (req: Request, res: Response) => {
  const cat = db.categories.find((c) => c.id === req.params.id || c.slug === req.params.id);
  if (!cat) return sendError(res, 404, 'CATEGORY_NOT_FOUND', 'Category not found');
  return sendSuccess(res, 200, 'Category detail retrieved', cat);
});

router.put('/admin/categories/:id', (req: Request, res: Response) => {
  const cat = db.categories.find((c) => c.id === req.params.id);
  if (!cat) return sendError(res, 404, 'CATEGORY_NOT_FOUND', 'Category not found');

  if (req.body.name !== undefined) cat.name = req.body.name;
  if (req.body.icon !== undefined) cat.icon = req.body.icon;
  if (req.body.slug !== undefined) {
    cat.slug = req.body.slug || slugifyCategoryName(cat.name);
  } else if (req.body.name !== undefined && !req.body.slug) {
    cat.slug = slugifyCategoryName(cat.name);
  }
  return sendSuccess(res, 200, 'Category updated', cat);
});

router.delete('/admin/categories/:id', (req: Request, res: Response) => {
  const index = db.categories.findIndex((c) => c.id === req.params.id);
  if (index !== -1) db.categories.splice(index, 1);
  return sendSuccess(res, 200, 'Category deleted', { id: req.params.id });
});

// Units CRUD (Reading & Mutating db.units directly)
router.get('/units', (req: Request, res: Response) => {
  return sendSuccess(res, 200, 'Measurement units retrieved', db.units);
});

router.post('/admin/units', (req: Request, res: Response) => {
  const newUnit: Unit = {
    id: 'unit_' + Date.now(),
    code: req.body.code || 'box',
    label: req.body.label || 'Box',
  };
  db.units.push(newUnit);
  return sendSuccess(res, 201, 'Measurement unit created', newUnit);
});

router.get('/units/:id', (req: Request, res: Response) => {
  const unit = db.units.find((u) => u.id === req.params.id || u.code === req.params.id);
  if (!unit) return sendError(res, 404, 'UNIT_NOT_FOUND', 'Unit not found');
  return sendSuccess(res, 200, 'Unit detail retrieved', unit);
});

router.put('/admin/units/:id', (req: Request, res: Response) => {
  const unit = db.units.find((u) => u.id === req.params.id);
  if (!unit) return sendError(res, 404, 'UNIT_NOT_FOUND', 'Unit not found');

  Object.assign(unit, req.body);
  return sendSuccess(res, 200, 'Unit updated', unit);
});

router.delete('/admin/units/:id', (req: Request, res: Response) => {
  const index = db.units.findIndex((u) => u.id === req.params.id);
  if (index !== -1) db.units.splice(index, 1);
  return sendSuccess(res, 200, 'Unit deleted', { id: req.params.id });
});

export default router;
