import {Thing} from './Thing';

class Product extends Thing {

    category?: string;
    discontinued?: boolean;
    price?: number;
    isRelatedTo?: Product | number;
    isSimilarTo?: Product | number;
    model?: string;
    productID?: string;
    releaseDate?: Date;
    keywords?: string[];
    productDimensions?: any;
    specialOffers?: any[];
    productImage?: any;
    madeIn?: any;

    constructor() {
        super();
    }
}

export {
    Product
}