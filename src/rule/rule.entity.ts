import { Column, Entity } from 'typeorm';
import { BaseEntity } from '../shared/super/base-entity';
import { RuleInterface } from './rule.interface';
import { Property } from '../mapper/property.decorator';

@Entity({ orderBy: { order: 'ASC' } })
export class Rule extends BaseEntity implements RuleInterface {
  @Property()
  @Column()
  description!: string;

  @Property()
  @Column()
  order!: number;
}