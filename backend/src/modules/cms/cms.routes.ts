import { Router, Request, Response } from 'express';
import { sendSuccess, sendError } from '../../utils/response';
import { db, Banner, SocialLink, CmsPage } from '../../store/db.store';
import {
  countBy,
  countWhere,
  deleteBanner,
  deleteCmsPage,
  deleteSocialLink,
  findCmsPageBySlug,
  getSiteConfig,
  listActiveBanners,
  listBanners,
  listSocialLinks,
  updateSiteConfig,
  upsertBanner,
  upsertCmsPage,
  upsertSocialLink,
} from '../../services/sql-store';


const router = Router();

async function buildSiteConfig() {
  const buildFromSource = (activeFarmers: number, activeCustomers: number, activeB2b: number, totalProducts: number, activeBanners: number) => ({
    brand: {
      name: 'Aswamithra',
      tagline: 'Premium farm-direct commerce for every role.',
      supportEmail: 'support@aswamithra.in',
    },
    theme: {
      palette: ['#ffffff', '#1f4fd6', '#2f8f5b', '#ff8a1f'],
      typography: 'slim-sans-display',
    },
    landing: {
      eyebrow: 'Direct from farm',
      title: 'Premium marketplace powered by the backend.',
      description:
        'Customers discover nearby produce, farmers manage listings and payouts, B2B teams run RFQs and invoices, and admins control KYC, finance, banners, and roles from live server data.',
      stats: [
        { label: 'Verified farmers', value: `${activeFarmers}+` },
        { label: 'Active customers', value: `${activeCustomers}+` },
        { label: 'B2B buyers', value: `${activeB2b}+` },
        { label: 'Live products', value: `${totalProducts}+` },
      ],
      banners: activeBanners,
      ctas: [
        { label: 'Get started', href: '/login', variant: 'primary' },
        { label: 'Sign in', href: '/login', variant: 'secondary' },
      ],
    },
    auth: {
      title: 'Role based access',
      subtitle: 'Choose a portal, verify mobile, then finish the server-driven onboarding flow.',
      roles: [
        {
          key: 'customer',
          label: 'Customer',
          summary: 'Browse nearby products, save addresses, order quickly, and track delivery.',
          entryLabel: 'Create customer account',
        },
        {
          key: 'farmer',
          label: 'Farmer',
          summary: 'List crops, manage orders, review payouts, and complete KYC.',
          entryLabel: 'Start farmer signup',
        },
        {
          key: 'b2b',
          label: 'B2B Buyer',
          summary: 'Submit RFQs, compare wholesale quotes, and manage invoices and credit.',
          entryLabel: 'Create B2B account',
        },
        {
          key: 'admin',
          label: 'Admin',
          summary: 'Open the secure command center for KYC, shops, finance, CMS, and audit.',
          entryLabel: 'Open admin console',
        },
      ],
      steps: ['Pick role', 'Verify mobile OTP', 'Complete onboarding'],
    },
    onboarding: {
      customer: {
        title: 'Customer onboarding',
        subtitle: 'Finish your delivery profile so the portal can save addresses and language settings.',
        fields: [
          { key: 'name', label: 'Full name', type: 'text', placeholder: 'Your full name', required: true },
          { key: 'address', label: 'Delivery address', type: 'textarea', placeholder: 'House number, street, landmark', required: true },
          { key: 'city', label: 'City', type: 'text', placeholder: 'City', required: true },
          { key: 'pincode', label: 'Pincode', type: 'text', placeholder: 'Pincode', required: true },
          { key: 'language', label: 'Preferred language', type: 'select', options: ['English', 'Telugu', 'Hindi'], required: true },
        ],
      },
      farmer: {
        title: 'Farmer onboarding',
        subtitle: 'Submit your KYC details so admin can approve your farm profile and payouts.',
        fields: [
          { key: 'name', label: 'Full name', type: 'text', placeholder: 'Full name', required: true },
          { key: 'village', label: 'Village', type: 'text', placeholder: 'Village', required: true },
          { key: 'district', label: 'District', type: 'text', placeholder: 'District', required: true },
          { key: 'aadhaarNumber', label: 'Aadhaar number', type: 'text', placeholder: '1234 5678 9012', required: true },
          { key: 'bankAccountNumber', label: 'Bank account number', type: 'text', placeholder: 'Bank account number', required: true },
          { key: 'ifscCode', label: 'IFSC code', type: 'text', placeholder: 'IFSC', required: true },
        ],
      },
      b2b: {
        title: 'B2B onboarding',
        subtitle: 'Complete business and GST details for wholesale access and invoice generation.',
        fields: [
          { key: 'businessName', label: 'Business name', type: 'text', placeholder: 'Company or business name', required: true },
          { key: 'gstin', label: 'GSTIN', type: 'text', placeholder: 'GSTIN', required: true },
          { key: 'address', label: 'Business address', type: 'textarea', placeholder: 'Office or warehouse address', required: true },
          { key: 'city', label: 'City', type: 'text', placeholder: 'City', required: true },
          { key: 'pincode', label: 'Pincode', type: 'text', placeholder: 'Pincode', required: true },
        ],
      },
    },
    portals: {
      customer: {
        title: 'Customer Marketplace',
        subtitle: 'Search nearby produce, manage delivery addresses, review savings, and track orders from one place.',
        basePath: '/customer',
        workflow: ['Choose pin', 'Browse radius', 'Add to cart', 'Pay or COD', 'Track delivery', 'Rate the farmer'],
        nav: [
          { key: 'home', label: 'Home', href: '/customer/home' },
          { key: 'browse', label: 'Browse', href: '/customer/browse' },
          { key: 'orders', label: 'Orders', href: '/customer/orders' },
          { key: 'savings', label: 'Savings', href: '/customer/savings' },
          { key: 'profile', label: 'Profile', href: '/customer/profile' },
          { key: 'disputes', label: 'Support', href: '/customer/disputes' },
        ],
      },
      farmer: {
        title: 'Farmer Seller Portal',
        subtitle: 'Manage products, accept orders, track earnings, and keep your payout profile ready.',
        basePath: '/farmer',
        workflow: ['Verify KYC', 'List products', 'Receive orders', 'Pack and hand over', 'Track payout'],
        nav: [
          { key: 'home', label: 'Dashboard', href: '/farmer/home' },
          { key: 'products', label: 'Products', href: '/farmer/products' },
          { key: 'orders', label: 'Orders', href: '/farmer/orders' },
          { key: 'earnings', label: 'Earnings', href: '/farmer/earnings' },
          { key: 'payouts', label: 'Payouts', href: '/farmer/payouts' },
          { key: 'profile', label: 'KYC/Profile', href: '/farmer/profile' },
          { key: 'rfqs', label: 'RFQs', href: '/farmer/rfqs' },
        ],
      },
      b2b: {
        title: 'B2B Wholesale Portal',
        subtitle: 'Run RFQs, compare bulk quotes, and keep invoices and credit in one workspace.',
        basePath: '/b2b',
        workflow: ['Browse bulk catalog', 'Create RFQ', 'Compare quotes', 'Accept order', 'Review invoice', 'Track dispatch'],
        nav: [
          { key: 'home', label: 'Catalog', href: '/b2b/home' },
          { key: 'rfq-new', label: 'New RFQ', href: '/b2b/rfq/new' },
          { key: 'rfq', label: 'Quotes', href: '/b2b/rfq/rfq_101' },
          { key: 'invoices', label: 'Invoices', href: '/b2b/invoices' },
          { key: 'credit', label: 'Credit', href: '/b2b/credit' },
          { key: 'dispatches', label: 'Dispatch', href: '/b2b/dispatches/ord_889210' },
        ],
      },
      admin: {
        title: 'Admin Command Center',
        subtitle: 'Operate KYC, commission slabs, CMS, shops, disputes, analytics, and RBAC.',
        basePath: '/admin',
        workflow: ['Review KYC', 'Manage content', 'Adjust rules', 'Resolve issues', 'Export reports'],
        nav: [
          { key: 'home', label: 'Dashboard', href: '/admin/home' },
          { key: 'kyc', label: 'KYC', href: '/admin/kyc' },
          { key: 'commissions', label: 'Commissions', href: '/admin/commissions' },
          { key: 'categories', label: 'Categories', href: '/admin/categories' },
          { key: 'shops', label: 'Shops/POS', href: '/admin/shops' },
          { key: 'finance', label: 'Finance', href: '/admin/finance' },
          { key: 'cms', label: 'CMS', href: '/admin/cms' },
          { key: 'disputes', label: 'Disputes', href: '/admin/disputes' },
          { key: 'audit', label: 'Audit', href: '/admin/audit' },
        ],
      },
    },
  });

  try {
    const [activeFarmers, activeCustomers, activeB2b, totalProducts, activeBanners] = await Promise.all([
      countWhere('users', [{ column: 'role', value: 'farmer' }, { column: 'status', value: 'active' }]),
      countWhere('users', [{ column: 'role', value: 'customer' }, { column: 'status', value: 'active' }]),
      countWhere('users', [{ column: 'role', value: 'b2b' }, { column: 'status', value: 'active' }]),
      countBy('products', 'status', 'active'),
      countBy('banners', 'status', 'active'),
    ]);

    return buildFromSource(activeFarmers, activeCustomers, activeB2b, totalProducts, activeBanners);
    } catch {
    const activeFarmers = db.users.filter((user) => user.role === 'farmer' && user.status === 'active').length;
    const activeCustomers = db.users.filter((user) => user.role === 'customer' && user.status === 'active').length;
    const activeB2b = db.users.filter((user) => user.role === 'b2b' && user.status === 'active').length;
    const totalProducts = db.products.filter((product) => product.status === 'active').length;
    const activeBanners = db.banners.filter((banner) => banner.status === 'active').length;

    return buildFromSource(activeFarmers, activeCustomers, activeB2b, totalProducts, activeBanners);
  }
}

// Site config with map fields
router.get('/site/config', async (req: Request, res: Response) => {
  try {
    const cfg = await getSiteConfig();
    const config = await buildSiteConfig();
    return sendSuccess(res, 200, 'Frontend site configuration', {
      ...config,
      map: {
        mapLat: cfg.mapLat,
        mapLng: cfg.mapLng,
        mapAddress: cfg.mapAddress,
      },
    });
  } catch {
    const config = await buildSiteConfig();
    return sendSuccess(res, 200, 'Frontend site configuration', {
      ...config,
      map: {
        mapLat: db.mapLat,
        mapLng: db.mapLng,
        mapAddress: db.mapAddress,
      },
    });
  }
});

router.put('/admin/site/config', async (req: Request, res: Response) => {
  const { mapLat, mapLng, mapAddress } = req.body || {};
  try {
    await updateSiteConfig({
      mapLat: mapLat != null ? Number(mapLat) : undefined,
      mapLng: mapLng != null ? Number(mapLng) : undefined,
      mapAddress: mapAddress ?? undefined,
    });
    return sendSuccess(res, 200, 'Site config updated', { mapLat: db.mapLat, mapLng: db.mapLng, mapAddress: db.mapAddress });
  } catch (error) {
    // Fallback: update in-memory store only
    if (mapLat != null) db.mapLat = Number(mapLat);
    if (mapLng != null) db.mapLng = Number(mapLng);
    if (mapAddress != null) db.mapAddress = mapAddress;
    return sendSuccess(res, 200, 'Site config updated (in-memory)', { mapLat: db.mapLat, mapLng: db.mapLng, mapAddress: db.mapAddress });
  }
});


router.get('/banners', async (req: Request, res: Response) => {
  const rows = await listActiveBanners();
  const activeBanners = rows.map((banner) => ({
    id: banner.id,
    title: banner.title,
    imageUrl: banner.image_url,
    linkUrl: banner.link_url,
    audience: banner.audience,
    status: banner.status as 'active' | 'draft',
  }));
  return sendSuccess(res, 200, 'Active homepage banners', activeBanners);
});

router.get('/admin/banners', async (req: Request, res: Response) => {
  const rows = await listBanners();
  return sendSuccess(
    res,
    200,
    'All banners (Admin)',
    rows.map((banner) => ({
      id: banner.id,
      title: banner.title,
      imageUrl: banner.image_url,
      linkUrl: banner.link_url,
      audience: banner.audience,
      status: banner.status as 'active' | 'draft',
    })),
  );
});

router.put('/admin/banners/reorder', (req: Request, res: Response) => {
  return sendSuccess(res, 200, 'Banners sequence reordered');
});

router.post('/admin/banners', async (req: Request, res: Response) => {
  const newBanner: Banner = {
    id: 'ban_' + Date.now(),
    title: req.body.title || 'New Promotion',
    imageUrl: req.body.imageUrl || 'https://storage.aswamithra.in/banners/promo.webp',
    linkUrl: req.body.linkUrl || '/browse',
    audience: req.body.audience || 'customer',
    status: 'active',
  };
  db.banners.push(newBanner);
  await upsertBanner(newBanner);
  return sendSuccess(res, 201, 'Banner created', newBanner);
});

router.get('/admin/banners/:id', (req: Request, res: Response) => {
  const banner = db.banners.find((b) => b.id === req.params.id);
  if (!banner) return sendError(res, 404, 'BANNER_NOT_FOUND', 'Banner not found');
  return sendSuccess(res, 200, 'Banner detail', banner);
});

router.put('/admin/banners/:id', async (req: Request, res: Response) => {
  const banner = db.banners.find((b) => b.id === req.params.id);
  if (!banner) return sendError(res, 404, 'BANNER_NOT_FOUND', 'Banner not found');

  Object.assign(banner, req.body);
  await upsertBanner(banner);
  return sendSuccess(res, 200, 'Banner updated', banner);
});

router.delete('/admin/banners/:id', async (req: Request, res: Response) => {
  const bannerId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const index = db.banners.findIndex((b) => b.id === bannerId);
  if (index !== -1) db.banners.splice(index, 1);
  await deleteBanner(bannerId);
  return sendSuccess(res, 200, 'Banner deleted', { id: bannerId });
});

// Social Links CRUD
router.get('/social-links', async (req: Request, res: Response) => {
  const rows = await listSocialLinks();
  const visible = rows
    .filter((s) => s.is_visible)
    .map((s) => ({
      id: s.id,
      platform: s.platform,
      url: s.url,
      isVisible: s.is_visible,
    }));
  return sendSuccess(res, 200, 'Official social media links', visible);
});

router.get('/admin/social-links', async (req: Request, res: Response) => {
  const rows = await listSocialLinks();
  return sendSuccess(
    res,
    200,
    'Social links config (Admin)',
    rows.map((s) => ({
      id: s.id,
      platform: s.platform,
      url: s.url,
      isVisible: s.is_visible,
    })),
  );
});

router.post('/admin/social-links', async (req: Request, res: Response) => {
  const newLink: SocialLink = {
    id: 'soc_' + Date.now(),
    platform: req.body.platform || 'whatsapp',
    url: req.body.url || 'https://whatsapp.com/channel/aswamithra',
    isVisible: true,
  };
  db.socialLinks.push(newLink);
  await upsertSocialLink(newLink);
  return sendSuccess(res, 201, 'Social link added', newLink);
});

router.get('/admin/social-links/:id', (req: Request, res: Response) => {
  const link = db.socialLinks.find((s) => s.id === req.params.id);
  if (!link) return sendError(res, 404, 'LINK_NOT_FOUND', 'Social link not found');
  return sendSuccess(res, 200, 'Social link detail', link);
});

router.put('/admin/social-links/:id', async (req: Request, res: Response) => {
  const link = db.socialLinks.find((s) => s.id === req.params.id);
  if (!link) return sendError(res, 404, 'LINK_NOT_FOUND', 'Social link not found');

  Object.assign(link, req.body);
  await upsertSocialLink(link);
  return sendSuccess(res, 200, 'Social link updated', link);
});

router.delete('/admin/social-links/:id', async (req: Request, res: Response) => {
  const linkId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const index = db.socialLinks.findIndex((s) => s.id === linkId);
  if (index !== -1) db.socialLinks.splice(index, 1);
  await deleteSocialLink(linkId);
  return sendSuccess(res, 200, 'Social link deleted', { id: linkId });
});

// CMS Static Pages CRUD
router.get('/cms/pages/:slug', async (req: Request, res: Response) => {
  const slug = Array.isArray(req.params.slug) ? req.params.slug[0] : req.params.slug;
  const pageRow = await findCmsPageBySlug(slug);
  const page = pageRow || db.cmsPages.find((p) => p.slug === slug);
  if (!page) return sendError(res, 404, 'CMS_PAGE_NOT_FOUND', 'CMS page not found');
  return sendSuccess(res, 200, 'Static CMS page content', page);
});

router.get('/site/config', async (req: Request, res: Response) => {
  return sendSuccess(res, 200, 'Frontend site configuration', await buildSiteConfig());
});

router.get('/portal/config/:role', async (req: Request, res: Response) => {
  const config = await buildSiteConfig();
  const role = req.params.role as keyof typeof config.portals;
  const portal = config.portals[role] || config.portals.customer;
  return sendSuccess(res, 200, 'Portal configuration', portal);
});

router.post('/admin/cms/pages', async (req: Request, res: Response) => {
  const newPage: CmsPage = {
    slug: req.body.slug || 'privacy-policy',
    title: req.body.title || 'Privacy Policy',
    content: req.body.content || 'Privacy details...',
    updatedAt: new Date().toISOString(),
  };
  db.cmsPages.push(newPage);
  await upsertCmsPage({
    slug: newPage.slug,
    title: newPage.title,
    content: newPage.content,
  });
  return sendSuccess(res, 201, 'Static CMS page created', newPage);
});

router.put('/admin/cms/pages/:slug', async (req: Request, res: Response) => {
  const slug = Array.isArray(req.params.slug) ? req.params.slug[0] : req.params.slug;
  const page = db.cmsPages.find((p) => p.slug === slug);
  if (page) {
    Object.assign(page, req.body);
    page.updatedAt = new Date().toISOString();
  }
  await upsertCmsPage({
    slug,
    title: req.body.title || page?.title || 'Untitled',
    content: req.body.content || page?.content || '',
  });
  return sendSuccess(res, 200, 'Static CMS page updated', page || { slug, ...req.body });
});

router.delete('/admin/cms/pages/:slug', async (req: Request, res: Response) => {
  const slug = Array.isArray(req.params.slug) ? req.params.slug[0] : req.params.slug;
  const index = db.cmsPages.findIndex((p) => p.slug === slug);
  if (index !== -1) db.cmsPages.splice(index, 1);
  await deleteCmsPage(slug);
  return sendSuccess(res, 200, 'Static CMS page deleted', { slug });
});

export default router;
