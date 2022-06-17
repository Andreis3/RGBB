import { IPaginationOptions } from 'nestjs-typeorm-paginate';

export default class PaginationOptions implements IPaginationOptions {
  route?: string;

  limit = 10;

  page = 1;

  get() {
    return {
      page: parseInt(this.page.toString()),
      limit: parseInt(this.limit.toString()),
    };
  }
}
