import { SelectQueryBuilder } from 'typeorm';
import PaginationOptions from './PaginationOption';
import { Pagination } from 'nestjs-typeorm-paginate';

export interface SearchCondition<Entity> {
  apply(query: SelectQueryBuilder<Entity>): SelectQueryBuilder<Entity>;
}

export interface Searchable<Entity> {
  search(condition: SearchCondition<Entity>, pagination: PaginationOptions): Promise<Pagination<Entity>>;
}
