import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import clientsRouter from "./clients";
import vendorsRouter from "./vendors";
import productsRouter from "./products";
import bundlesRouter from "./bundles";
import salesOrdersRouter from "./salesOrders";
import purchaseOrdersRouter from "./purchaseOrders";
import inventoryRouter from "./inventory";
import assemblyRouter from "./assembly";
import artworkRouter from "./artwork";
import shipmentsRouter from "./shipments";
import invoicesRouter from "./invoices";
import analyticsRouter from "./analytics";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(clientsRouter);
router.use(vendorsRouter);
router.use(productsRouter);
router.use(bundlesRouter);
router.use(salesOrdersRouter);
router.use(purchaseOrdersRouter);
router.use(inventoryRouter);
router.use(assemblyRouter);
router.use(artworkRouter);
router.use(shipmentsRouter);
router.use(invoicesRouter);
router.use(analyticsRouter);

export default router;
