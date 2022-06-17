import { Repository } from 'typeorm';
import { Searchable, SearchCondition } from './Searcher';
import PaginationOptions from './PaginationOption';
import { paginate } from 'nestjs-typeorm-paginate';

export default abstract class BaseRepository<Entity> extends Repository<Entity> implements Searchable<Entity> {
  async search(condition: SearchCondition<Entity>, pagination: PaginationOptions) {
    return await paginate(condition.apply(this.createQueryBuilder(this.metadata.tableName)), pagination.get());
  }
}
