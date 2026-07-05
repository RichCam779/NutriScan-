import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NutricionistaPageComponent } from './nutricionista-page';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('NutricionistaPageComponent', () => {
  let component: NutricionistaPageComponent;
  let fixture: ComponentFixture<NutricionistaPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NutricionistaPageComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            params: of({}),
            queryParams: of({})
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(NutricionistaPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
